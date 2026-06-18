import { Router } from "express"
import { prisma } from "../db.js"
import { authguard, clientAuthguard } from "../middlewares/authguard.js"

// Router dedie aux pages calendrier et aux endpoints JSON consommes par
// FullCalendar cote navigateur.
const reservationRouter = Router()

// Statuts metier possibles. Les clients creent des demandes PENDING; les
// managers creent ou valident des reservations APPROVED.
const reservationStatus = {
    pending: "PENDING",
    approved: "APPROVED"
}

// Controle qu'un objet Date est reellement exploitable apres parsing.
const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime())

// Recherche une reservation validee qui chevauche le creneau demande pour le
// meme poste. La condition start < end && end > start couvre tous les cas de
// recouvrement partiel ou total.
const getOverlappingReservation = ({ computerId, startAt, endAt, ignoredReservationId }) => {
    const where = {
        computerId,
        status: reservationStatus.approved,
        startAt: {
            lt: endAt
        },
        endAt: {
            gt: startAt
        }
    }

    if (ignoredReservationId) {
        // Utilise lors de la validation d'une demande pour ne pas se comparer
        // a elle-meme si elle etait deja presente dans le resultat.
        where.id = {
            not: ignoredReservationId
        }
    }

    return prisma.reservation.findFirst({ where })
}

// Convertit une reservation Prisma en evenement FullCalendar. La version
// client masque les details des reservations des autres clients.
const formatReservationEvent = (reservation, viewer = "manager", viewerClientId = null) => {
    const isOwnReservation = viewerClientId === reservation.clientId
    const isPending = reservation.status === reservationStatus.pending
    const statusLabel = isPending ? "En attente" : "Validee"
    const title = viewer === "client" && !isOwnReservation
        ? `${reservation.computer.name} reserve`
        : `${statusLabel} - ${reservation.computer.name} - ${reservation.client.firstname} ${reservation.client.lastname}`
    const eventColor = isPending ? "#b45309" : (isOwnReservation ? "#0058be" : "#727785")

    return {
        id: String(reservation.id),
        title,
        start: reservation.startAt,
        end: reservation.endAt,
        backgroundColor: eventColor,
        borderColor: eventColor,
        extendedProps: {
            computerId: reservation.computerId,
            computerName: reservation.computer.name,
            clientId: reservation.clientId,
            clientName: `${reservation.client.firstname} ${reservation.client.lastname}`,
            isOwnReservation,
            status: reservation.status,
            isPending
        }
    }
}

// Format compact utilise par la liste manager des demandes a valider.
const formatPendingReservation = (reservation) => ({
    id: reservation.id,
    start: reservation.startAt,
    end: reservation.endAt,
    computerName: reservation.computer.name,
    clientName: `${reservation.client.firstname} ${reservation.client.lastname}`
})

// Page calendrier client.
reservationRouter.get("/reservations-client", clientAuthguard, async (req, res) => {
    res.render("pages/reservationsClient.twig", {
        client: req.client,
        manager: req.client.manager
    })
})

// Page calendrier manager.
reservationRouter.get("/reservations", authguard, async (req, res) => {
    res.render("pages/reservations.twig", {
        manager: req.manager
    })
})

// Liste les postes reservables par le client: meme manager que le client et
// poste non casse.
reservationRouter.get("/api/client/computers", clientAuthguard, async (req, res) => {
    const computers = await prisma.computer.findMany({
        where: {
            managerId: req.client.managerId,
            isBroken: false
        },
        orderBy: {
            name: "asc"
        },
        select: {
            id: true,
            name: true
        }
    })

    res.json(computers)
})

// Liste les postes reservables par le manager connecte.
reservationRouter.get("/api/manager/computers", authguard, async (req, res) => {
    const computers = await prisma.computer.findMany({
        where: {
            managerId: req.session.managerId,
            isBroken: false
        },
        orderBy: {
            name: "asc"
        },
        select: {
            id: true,
            name: true
        }
    })

    res.json(computers)
})

// Liste les clients du manager pour le formulaire d'ajout de reservation.
reservationRouter.get("/api/manager/clients", authguard, async (req, res) => {
    const clients = await prisma.client.findMany({
        where: {
            managerId: req.session.managerId
        },
        orderBy: [
            {
                lastname: "asc"
            },
            {
                firstname: "asc"
            }
        ],
        select: {
            id: true,
            firstname: true,
            lastname: true
        }
    })

    res.json(clients)
})

// Charge les evenements visibles par un client: toutes les reservations
// validees de son manager + ses propres demandes en attente.
reservationRouter.get("/api/client/reservations", clientAuthguard, async (req, res) => {
    const reservations = await prisma.reservation.findMany({
        where: {
            managerId: req.client.managerId,
            OR: [
                {
                    status: reservationStatus.approved
                },
                {
                    clientId: req.client.id
                }
            ]
        },
        include: {
            client: true,
            computer: true
        },
        orderBy: {
            startAt: "asc"
        }
    })

    res.json(reservations.map((reservation) => formatReservationEvent(reservation, "client", req.client.id)))
})

// Cree une demande client. Elle reste PENDING tant qu'un manager ne la valide
// pas explicitement.
reservationRouter.post("/api/client/reservations", clientAuthguard, async (req, res) => {
    const computerId = parseInt(req.body.computerId)
    const startAt = new Date(req.body.start)
    const endAt = new Date(req.body.end)

    if (Number.isNaN(computerId) || !isValidDate(startAt) || !isValidDate(endAt) || startAt >= endAt) {
        return res.status(400).json({ message: "Creneau invalide." })
    }

    // Interdit les reservations dans le passe, meme si le navigateur etait
    // contourne ou mal configure.
    if (startAt < new Date()) {
        return res.status(400).json({ message: "Impossible de reserver un creneau passe." })
    }

    // Le poste doit appartenir au manager du client et etre disponible.
    const computer = await prisma.computer.findFirst({
        where: {
            id: computerId,
            managerId: req.client.managerId,
            isBroken: false
        }
    })

    if (!computer) {
        return res.status(404).json({ message: "Poste indisponible." })
    }

    // Seules les reservations deja approuvees bloquent le creneau. Plusieurs
    // demandes en attente peuvent donc viser un meme poste, le manager tranche.
    const overlap = await getOverlappingReservation({ computerId, startAt, endAt })

    if (overlap) {
        return res.status(409).json({ message: "Ce poste est deja reserve sur ce creneau." })
    }

    const reservation = await prisma.reservation.create({
        data: {
            startAt,
            endAt,
            managerId: req.client.managerId,
            clientId: req.client.id,
            computerId,
            status: reservationStatus.pending
        },
        include: {
            client: true,
            computer: true
        }
    })

    res.status(201).json(formatReservationEvent(reservation, "client", req.client.id))
})

// Cree une reservation directement approuvee depuis l'interface manager.
reservationRouter.post("/api/manager/reservations", authguard, async (req, res) => {
    const computerId = parseInt(req.body.computerId)
    const clientId = parseInt(req.body.clientId)
    const startAt = new Date(req.body.start)
    const endAt = new Date(req.body.end)

    if (Number.isNaN(computerId) || Number.isNaN(clientId) || !isValidDate(startAt) || !isValidDate(endAt) || startAt >= endAt) {
        return res.status(400).json({ message: "Creneau invalide." })
    }

    if (startAt < new Date()) {
        return res.status(400).json({ message: "Impossible de reserver un creneau passe." })
    }

    // Verifie en parallele que le poste et le client appartiennent bien au
    // manager connecte.
    const [computer, client] = await Promise.all([
        prisma.computer.findFirst({
            where: {
                id: computerId,
                managerId: req.session.managerId,
                isBroken: false
            }
        }),
        prisma.client.findFirst({
            where: {
                id: clientId,
                managerId: req.session.managerId
            }
        })
    ])

    if (!computer) {
        return res.status(404).json({ message: "Poste indisponible." })
    }

    if (!client) {
        return res.status(404).json({ message: "Client introuvable." })
    }

    const overlap = await getOverlappingReservation({ computerId, startAt, endAt })

    if (overlap) {
        return res.status(409).json({ message: "Ce poste est deja reserve sur ce creneau." })
    }

    const reservation = await prisma.reservation.create({
        data: {
            startAt,
            endAt,
            managerId: req.session.managerId,
            clientId,
            computerId,
            status: reservationStatus.approved
        },
        include: {
            client: true,
            computer: true
        }
    })

    res.status(201).json(formatReservationEvent(reservation))
})

// Retourne la file d'attente des demandes client a traiter par le manager.
reservationRouter.get("/api/manager/reservations/pending", authguard, async (req, res) => {
    const reservations = await prisma.reservation.findMany({
        where: {
            managerId: req.session.managerId,
            status: reservationStatus.pending
        },
        include: {
            client: true,
            computer: true
        },
        orderBy: {
            startAt: "asc"
        }
    })

    res.json(reservations.map(formatPendingReservation))
})

// Valide une demande client si le poste est toujours disponible sur le creneau.
reservationRouter.patch("/api/manager/reservations/:reservationId/approve", authguard, async (req, res) => {
    const reservationId = parseInt(req.params.reservationId)

    if (Number.isNaN(reservationId)) {
        return res.status(400).json({ message: "Reservation invalide." })
    }

    const reservation = await prisma.reservation.findFirst({
        where: {
            id: reservationId,
            managerId: req.session.managerId,
            status: reservationStatus.pending
        },
        include: {
            client: true,
            computer: true
        }
    })

    if (!reservation) {
        return res.status(404).json({ message: "Demande introuvable." })
    }

    // Une panne signalee apres la demande bloque la validation.
    if (reservation.computer.isBroken) {
        return res.status(409).json({ message: "Ce poste est actuellement en panne." })
    }

    // Recontrole le chevauchement au moment de la validation, car un manager
    // peut avoir ajoute une reservation depuis la creation de la demande.
    const overlap = await getOverlappingReservation({
        computerId: reservation.computerId,
        startAt: reservation.startAt,
        endAt: reservation.endAt,
        ignoredReservationId: reservation.id
    })

    if (overlap) {
        return res.status(409).json({ message: "Ce poste est deja reserve sur ce creneau." })
    }

    const approvedReservation = await prisma.reservation.update({
        where: {
            id: reservation.id
        },
        data: {
            status: reservationStatus.approved
        },
        include: {
            client: true,
            computer: true
        }
    })

    res.json(formatReservationEvent(approvedReservation))
})

// Permet a un client de supprimer uniquement ses propres reservations.
reservationRouter.delete("/api/client/reservations/:reservationId", clientAuthguard, async (req, res) => {
    const reservationId = parseInt(req.params.reservationId)

    if (Number.isNaN(reservationId)) {
        return res.status(400).json({ message: "Reservation invalide." })
    }

    await prisma.reservation.deleteMany({
        where: {
            id: reservationId,
            clientId: req.client.id
        }
    })

    res.json({ success: true })
})

// Flux complet des reservations pour le calendrier manager.
reservationRouter.get("/api/manager/reservations", authguard, async (req, res) => {
    const reservations = await prisma.reservation.findMany({
        where: {
            managerId: req.session.managerId
        },
        include: {
            client: true,
            computer: true
        },
        orderBy: {
            startAt: "asc"
        }
    })

    res.json(reservations.map((reservation) => formatReservationEvent(reservation)))
})

// Supprime une reservation appartenant au manager connecte.
reservationRouter.delete("/api/manager/reservations/:reservationId", authguard, async (req, res) => {
    const reservationId = parseInt(req.params.reservationId)

    if (Number.isNaN(reservationId)) {
        return res.status(400).json({ message: "Reservation invalide." })
    }

    await prisma.reservation.deleteMany({
        where: {
            id: reservationId,
            managerId: req.session.managerId
        }
    })

    res.json({ success: true })
})

export default reservationRouter
