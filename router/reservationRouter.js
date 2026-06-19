// Router vient d'Express; il sert a regrouper toutes les routes du calendrier.
import { Router } from "express"

// prisma est le client qui permet de lire et modifier la base de donnees.
import { prisma } from "../db.js"

// authguard protege les routes manager; clientAuthguard protege les routes client.
import { authguard, clientAuthguard } from "../middlewares/authguard.js"

// Router dedie aux pages calendrier et aux endpoints JSON consommes par
// FullCalendar cote navigateur.
const reservationRouter = Router()

// Statuts metier possibles. Les clients creent des demandes PENDING; les
// managers creent ou valident des reservations APPROVED.
const reservationStatus = {
    // Demande creee par un client, pas encore acceptee par le manager.
    pending: "PENDING",

    // Reservation validee, visible comme creneau vraiment reserve.
    approved: "APPROVED"
}

// Controle qu'un objet Date est reellement exploitable apres parsing.
// new Date("n'importe quoi") cree parfois un objet Date invalide; getTime()
// renvoie alors NaN, donc on le refuse.
const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime())

// Recherche une reservation validee qui chevauche le creneau demande pour le
// meme poste. La condition start < end && end > start couvre tous les cas de
// recouvrement partiel ou total.
const getOverlappingReservation = ({ computerId, startAt, endAt, ignoredReservationId }) => {
    // Objet Prisma qui decrit les conditions de recherche.
    const where = {
        // On cherche seulement les reservations du meme ordinateur.
        computerId,

        // Seules les reservations approuvees bloquent reellement un creneau.
        status: reservationStatus.approved,

        // La reservation existante commence avant la fin du creneau demande.
        startAt: {
            lt: endAt
        },

        // La reservation existante finit apres le debut du creneau demande.
        endAt: {
            gt: startAt
        }
    }

    if (ignoredReservationId) {
        // Utilise lors de la validation d'une demande pour ne pas se comparer
        // a elle-meme si elle etait deja presente dans le resultat.
        where.id = {
            // Prisma: "id different de ignoredReservationId".
            not: ignoredReservationId
        }
    }

    // findFirst renvoie la premiere reservation qui correspond, ou null.
    return prisma.reservation.findFirst({ where })
}

// Convertit une reservation Prisma en evenement FullCalendar. La version
// client masque les details des reservations des autres clients.
const formatReservationEvent = (reservation, viewer = "manager", viewerClientId = null) => {
    // Vrai si le client qui regarde est le proprietaire de cette reservation.
    const isOwnReservation = viewerClientId === reservation.clientId

    // Vrai si la reservation attend encore la validation manager.
    const isPending = reservation.status === reservationStatus.pending

    // Libelle court utilise dans le titre de l'evenement.
    const statusLabel = isPending ? "En attente" : "Validee"

    // Si un client regarde une reservation qui n'est pas la sienne, on masque
    // le nom du client proprietaire.
    const title = viewer === "client" && !isOwnReservation
        ? `${reservation.computer.name} reserve`
        : `${statusLabel} - ${reservation.computer.name} - ${reservation.client.firstname} ${reservation.client.lastname}`

    // Orange pour les demandes en attente, bleu pour ses propres reservations,
    // gris pour les reservations des autres visibles cote client.
    const eventColor = isPending ? "#b45309" : (isOwnReservation ? "#0058be" : "#727785")

    // Format exact attendu par FullCalendar cote navigateur.
    return {
        // FullCalendar prefere un id string.
        id: String(reservation.id),

        // Texte affiche dans le calendrier.
        title,

        // Date de debut de l'evenement.
        start: reservation.startAt,

        // Date de fin de l'evenement.
        end: reservation.endAt,

        // Couleur de fond de l'evenement.
        backgroundColor: eventColor,

        // Couleur de bordure de l'evenement.
        borderColor: eventColor,

        // Donnees supplementaires accessibles dans event.extendedProps en JS.
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
    // Id utilise par le bouton "Valider".
    id: reservation.id,

    // Debut du creneau.
    start: reservation.startAt,

    // Fin du creneau.
    end: reservation.endAt,

    // Nom du poste demande.
    computerName: reservation.computer.name,

    // Nom complet du client demandeur.
    clientName: `${reservation.client.firstname} ${reservation.client.lastname}`
})

// Page calendrier client.
reservationRouter.get("/reservations-client", clientAuthguard, async (req, res) => {
    // clientAuthguard a deja charge req.client avec son manager.
    res.render("pages/reservationsClient.twig", {
        // Donnees client accessibles dans Twig.
        client: req.client,

        // Donnees manager affichees dans la page si besoin.
        manager: req.client.manager
    })
})

// Page calendrier manager.
reservationRouter.get("/reservations", authguard, async (req, res) => {
    // authguard a deja charge req.manager.
    res.render("pages/reservations.twig", {
        // Donnees manager accessibles dans Twig.
        manager: req.manager
    })
})

// Liste les postes reservables par le client: meme manager que le client et
// poste non casse.
reservationRouter.get("/api/client/computers", clientAuthguard, async (req, res) => {
    // On cherche les ordinateurs visibles par le client connecte.
    const computers = await prisma.computer.findMany({
        where: {
            // Le client ne voit que les postes de son cybercafe.
            managerId: req.client.managerId,

            // Les postes casses ne sont pas reservables.
            isBroken: false
        },

        // Tri alphabetique par nom de poste.
        orderBy: {
            name: "asc"
        },

        // On ne renvoie que ce dont le formulaire a besoin.
        select: {
            id: true,
            name: true
        }
    })

    // Reponse JSON consommee par reservationCalendar.js.
    res.json(computers)
})

// Liste les postes reservables par le manager connecte.
reservationRouter.get("/api/manager/computers", authguard, async (req, res) => {
    // Meme logique que cote client, mais basee sur la session manager.
    const computers = await prisma.computer.findMany({
        where: {
            // On limite aux postes du manager connecte.
            managerId: req.session.managerId,

            // Un poste casse ne peut pas etre reserve.
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

    // Liste envoyee au select des postes.
    res.json(computers)
})

// Liste les clients du manager pour le formulaire d'ajout de reservation.
reservationRouter.get("/api/manager/clients", authguard, async (req, res) => {
    // On recupere uniquement les clients appartenant au manager connecte.
    const clients = await prisma.client.findMany({
        where: {
            managerId: req.session.managerId
        },

        // Tri par nom puis prenom pour un select plus lisible.
        orderBy: [
            {
                lastname: "asc"
            },
            {
                firstname: "asc"
            }
        ],

        // On ne renvoie pas email, mot de passe, age, etc.
        select: {
            id: true,
            firstname: true,
            lastname: true
        }
    })

    // Liste envoyee au select client cote manager.
    res.json(clients)
})

// Charge les evenements visibles par un client: toutes les reservations
// validees de son manager + ses propres demandes en attente.
reservationRouter.get("/api/client/reservations", clientAuthguard, async (req, res) => {
    // FullCalendar appelle cette route pour afficher les evenements cote client.
    const reservations = await prisma.reservation.findMany({
        where: {
            // On reste dans le cybercafe du client.
            managerId: req.client.managerId,

            // Le client voit toutes les reservations validees, plus ses propres
            // reservations meme si elles sont encore en attente.
            OR: [
                {
                    status: reservationStatus.approved
                },
                {
                    clientId: req.client.id
                }
            ]
        },

        // On charge les relations necessaires pour construire le titre.
        include: {
            client: true,
            computer: true
        },

        // Tri chronologique.
        orderBy: {
            startAt: "asc"
        }
    })

    // On transforme chaque reservation Prisma en evenement FullCalendar.
    res.json(reservations.map((reservation) => formatReservationEvent(reservation, "client", req.client.id)))
})

// Cree une demande client. Elle reste PENDING tant qu'un manager ne la valide
// pas explicitement.
reservationRouter.post("/api/client/reservations", clientAuthguard, async (req, res) => {
    // Le formulaire envoie computerId en texte; on le convertit en nombre.
    const computerId = parseInt(req.body.computerId)

    // Dates ISO envoyees par le navigateur, retransformees en Date JS.
    const startAt = new Date(req.body.start)
    const endAt = new Date(req.body.end)

    // Validation de base: id correct, dates valides, debut avant fin.
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
            // Id du poste demande.
            id: computerId,

            // Le client ne peut pas reserver un poste d'un autre manager.
            managerId: req.client.managerId,

            // Le poste ne doit pas etre casse.
            isBroken: false
        }
    })

    // Si aucun poste ne correspond, on refuse la reservation.
    if (!computer) {
        return res.status(404).json({ message: "Poste indisponible." })
    }

    // Seules les reservations deja approuvees bloquent le creneau. Plusieurs
    // demandes en attente peuvent donc viser un meme poste, le manager tranche.
    const overlap = await getOverlappingReservation({ computerId, startAt, endAt })

    // Conflit: le poste est deja reserve officiellement sur ce creneau.
    if (overlap) {
        return res.status(409).json({ message: "Ce poste est deja reserve sur ce creneau." })
    }

    // Creation de la demande en base.
    const reservation = await prisma.reservation.create({
        data: {
            // Debut du creneau.
            startAt,

            // Fin du creneau.
            endAt,

            // Manager rattache au client connecte.
            managerId: req.client.managerId,

            // Client connecte; il n'est pas choisi depuis le formulaire.
            clientId: req.client.id,

            // Poste choisi.
            computerId,

            // Une demande client commence en attente.
            status: reservationStatus.pending
        },

        // On recharge client et computer pour formater l'evenement renvoye.
        include: {
            client: true,
            computer: true
        }
    })

    // 201 signifie "cree"; le JSON renvoye est ajoute dans FullCalendar.
    res.status(201).json(formatReservationEvent(reservation, "client", req.client.id))
})

// Cree une reservation directement approuvee depuis l'interface manager.
reservationRouter.post("/api/manager/reservations", authguard, async (req, res) => {
    // Le manager choisit un poste.
    const computerId = parseInt(req.body.computerId)

    // Le manager choisit aussi un client.
    const clientId = parseInt(req.body.clientId)

    // Dates recues du navigateur.
    const startAt = new Date(req.body.start)
    const endAt = new Date(req.body.end)

    // Controle des ids et dates.
    if (Number.isNaN(computerId) || Number.isNaN(clientId) || !isValidDate(startAt) || !isValidDate(endAt) || startAt >= endAt) {
        return res.status(400).json({ message: "Creneau invalide." })
    }

    // Le serveur refuse les reservations dans le passe.
    if (startAt < new Date()) {
        return res.status(400).json({ message: "Impossible de reserver un creneau passe." })
    }

    // Verifie en parallele que le poste et le client appartiennent bien au
    // manager connecte.
    const [computer, client] = await Promise.all([
        // Verification du poste.
        prisma.computer.findFirst({
            where: {
                id: computerId,
                managerId: req.session.managerId,
                isBroken: false
            }
        }),

        // Verification du client.
        prisma.client.findFirst({
            where: {
                id: clientId,
                managerId: req.session.managerId
            }
        })
    ])

    // Le poste n'existe pas, n'appartient pas au manager, ou est casse.
    if (!computer) {
        return res.status(404).json({ message: "Poste indisponible." })
    }

    // Le client n'existe pas ou n'appartient pas au manager.
    if (!client) {
        return res.status(404).json({ message: "Client introuvable." })
    }

    // On verifie que le poste n'est pas deja reserve sur ce creneau.
    const overlap = await getOverlappingReservation({ computerId, startAt, endAt })

    // 409 = conflit de planning.
    if (overlap) {
        return res.status(409).json({ message: "Ce poste est deja reserve sur ce creneau." })
    }

    // Creation directe d'une reservation validee.
    const reservation = await prisma.reservation.create({
        data: {
            startAt,
            endAt,
            managerId: req.session.managerId,
            clientId,
            computerId,
            // Le manager a le droit d'approuver directement.
            status: reservationStatus.approved
        },
        include: {
            client: true,
            computer: true
        }
    })

    // Evenement renvoye au calendrier manager.
    res.status(201).json(formatReservationEvent(reservation))
})

// Retourne la file d'attente des demandes client a traiter par le manager.
reservationRouter.get("/api/manager/reservations/pending", authguard, async (req, res) => {
    // On recupere seulement les demandes en attente du manager connecte.
    const reservations = await prisma.reservation.findMany({
        where: {
            managerId: req.session.managerId,
            status: reservationStatus.pending
        },

        // Client et poste sont necessaires pour afficher la carte de demande.
        include: {
            client: true,
            computer: true
        },

        // Les demandes les plus proches apparaissent d'abord.
        orderBy: {
            startAt: "asc"
        }
    })

    // Format compact pour la colonne "Demandes en attente".
    res.json(reservations.map(formatPendingReservation))
})

// Valide une demande client si le poste est toujours disponible sur le creneau.
reservationRouter.patch("/api/manager/reservations/:reservationId/approve", authguard, async (req, res) => {
    // Id de reservation lu dans l'URL.
    const reservationId = parseInt(req.params.reservationId)

    // Si l'id n'est pas un nombre, la requete est invalide.
    if (Number.isNaN(reservationId)) {
        return res.status(400).json({ message: "Reservation invalide." })
    }

    // On cherche une demande en attente appartenant au manager connecte.
    const reservation = await prisma.reservation.findFirst({
        where: {
            id: reservationId,
            managerId: req.session.managerId,
            status: reservationStatus.pending
        },

        // On charge aussi les relations pour verifier le poste et formater la reponse.
        include: {
            client: true,
            computer: true
        }
    })

    // Rien trouve: mauvaise reservation, deja traitee, ou hors perimetre.
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

    // Si le creneau n'est plus disponible, on ne valide pas.
    if (overlap) {
        return res.status(409).json({ message: "Ce poste est deja reserve sur ce creneau." })
    }

    // On transforme la demande PENDING en reservation APPROVED.
    const approvedReservation = await prisma.reservation.update({
        where: {
            id: reservation.id
        },
        data: {
            status: reservationStatus.approved
        },

        // Relations necessaires pour renvoyer un evenement FullCalendar complet.
        include: {
            client: true,
            computer: true
        }
    })

    // Reponse JSON utilisee par le front apres validation.
    res.json(formatReservationEvent(approvedReservation))
})

// Permet a un client de supprimer uniquement ses propres reservations.
reservationRouter.delete("/api/client/reservations/:reservationId", clientAuthguard, async (req, res) => {
    // Id lu depuis l'URL.
    const reservationId = parseInt(req.params.reservationId)

    // Controle de validite de l'id.
    if (Number.isNaN(reservationId)) {
        return res.status(400).json({ message: "Reservation invalide." })
    }

    // deleteMany permet de supprimer seulement si les deux conditions matchent.
    // Si la reservation n'appartient pas au client, rien n'est supprime.
    await prisma.reservation.deleteMany({
        where: {
            id: reservationId,
            clientId: req.client.id
        }
    })

    // On renvoie toujours success pour garder une suppression idempotente.
    res.json({ success: true })
})

// Flux complet des reservations pour le calendrier manager.
reservationRouter.get("/api/manager/reservations", authguard, async (req, res) => {
    // FullCalendar manager appelle cette route pour charger tous les evenements.
    const reservations = await prisma.reservation.findMany({
        where: {
            // Le manager ne voit que ses reservations.
            managerId: req.session.managerId
        },

        // Relations utiles pour les titres et extendedProps.
        include: {
            client: true,
            computer: true
        },

        // Tri chronologique.
        orderBy: {
            startAt: "asc"
        }
    })

    // Transformation Prisma -> FullCalendar.
    res.json(reservations.map((reservation) => formatReservationEvent(reservation)))
})

// Supprime une reservation appartenant au manager connecte.
reservationRouter.delete("/api/manager/reservations/:reservationId", authguard, async (req, res) => {
    // Id lu dans l'URL.
    const reservationId = parseInt(req.params.reservationId)

    // Controle de validite de l'id.
    if (Number.isNaN(reservationId)) {
        return res.status(400).json({ message: "Reservation invalide." })
    }

    // Le manager ne peut supprimer que les reservations de son perimetre.
    await prisma.reservation.deleteMany({
        where: {
            id: reservationId,
            managerId: req.session.managerId
        }
    })

    // Reponse simple consommee par requestJson().
    res.json({ success: true })
})

// Export du router pour qu'il soit branche dans server.js avec app.use().
export default reservationRouter
