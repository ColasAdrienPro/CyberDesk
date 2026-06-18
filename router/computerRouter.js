import { Router } from "express"
import { prisma } from "../db.js"
import { authguard } from "../middlewares/authguard.js"
import computerSchema from "../validations/computerValidation.js"

// Router responsable du CRUD des postes et de leur affectation aux clients.
const computerRouter = Router()

// Construit la requete Prisma du tableau ordinateurs selon recherche, statut
// et tri. managerId reste obligatoire pour isoler chaque cybercafe.
const getManagerComputer = (managerId, filters = {}) => {
    const search = filters.search?.trim()
    const status = filters.status
    const sort = filters.sort

    const where = {
        managerId
    }
    // Les conditions optionnelles sont combinees dans AND pour pouvoir cumuler
    // recherche texte + filtre de statut.
    const andConditions = []

    if (search) {
        andConditions.push({
            OR: [
                {
                    name: {
                        contains: search
                    }
                },
                {
                    macAddress: {
                        contains: search
                    }
                },
                {
                    client: {
                        is: {
                            OR: [
                                {
                                    firstname: {
                                        contains: search
                                    }
                                },
                                {
                                    lastname: {
                                        contains: search
                                    }
                                },
                                {
                                    email: {
                                        contains: search
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        })
    }

    if (status === "available") {
        andConditions.push({
            client: {
                is: null
            },
            isBroken: false
        })
    }

    if (status === "occupied") {
        andConditions.push({
            client: {
                isNot: null
            },
            isBroken: false
        })
    }

    if (status === "broken") {
        andConditions.push({
            isBroken: true
        })
    }

    if (andConditions.length > 0) {
        where.AND = andConditions
    }

    const orderBy = {
        id: "desc"
    }

    // Le tri par defaut est l'id desc; si l'UI demande un tri texte, on remplace
    // la cle orderBy pour eviter deux tris concurrents.
    if (sort === "name") {
        orderBy.name = "asc"
        delete orderBy.id
    }

    if (sort === "macAddress") {
        orderBy.macAddress = "asc"
        delete orderBy.id
    }

    return prisma.computer.findMany({
        where,
        include: {
            client: true
        },
        orderBy
    })
}

// Retourne les clients du manager qui n'ont pas encore de poste assigne.
const getAvailableClients = (managerId) => {
    return prisma.client.findMany({
        where: {
            managerId,
            computer: {
                is: null
            }
        },
        orderBy: {
            lastname: "asc"
        }
    })
}

// Prepare les compteurs et rend la page de gestion ordinateurs.
const renderComputerBoard = (res, computers, viewData = {}) => {
    const availableComputers = computers.filter((computer) => !computer.client).length

    return res.render("pages/computerboard.twig", {
        computers,
        availableComputers,
        occupiedComputers: computers.length - availableComputers,
        ...viewData
    })
}

// Affiche le tableau postes avec les filtres de l'URL.
computerRouter.get("/computerboard", authguard, async (req, res) => {
    const filters = {
        search: req.query.search ?? "",
        status: req.query.status ?? "",
        sort: req.query.sort ?? ""
    }
    const computers = await getManagerComputer(req.session.managerId, filters)
    const availableClients = await getAvailableClients(req.session.managerId)

    renderComputerBoard(res, computers, {
        availableClients,
        filters
    })
})

// Cree un nouveau poste apres validation et normalisation de l'adresse MAC.
computerRouter.post("/computerboard", authguard, async (req, res) => {
    const result = computerSchema.safeParse(req.body)

    if (!result.success) {
        const computers = await getManagerComputer(req.session.managerId)
        const availableClients = await getAvailableClients(req.session.managerId)

        return renderComputerBoard(res, computers, {
            errors: result.error.flatten().fieldErrors,
            old: req.body,
            availableClients
        })
    }

    try {
        await prisma.computer.create({
            data: {
                name: result.data.name,
                macAddress: result.data.macAddress,
                managerId: req.session.managerId
            }
        })

        return res.redirect("/computerboard")
    } catch (error) {
        console.error(error)

        const computers = await getManagerComputer(req.session.managerId)
        const availableClients = await getAvailableClients(req.session.managerId)

        return renderComputerBoard(res, computers, {
            errors: { general: ["Une erreur est survenue pendant l'ajout du poste."] },
            old: req.body,
            availableClients
        })
    }
})

// Modifie un poste en verifiant qu'il appartient bien au manager connecte.
computerRouter.post("/computer/:computerId/update", authguard, async (req, res) => {
    const computerId = parseInt(req.params.computerId)

    if (Number.isNaN(computerId)) {
        return res.redirect("/computerboard")
    }

    const result = computerSchema.safeParse(req.body)

    if (!result.success) {
        const computers = await getManagerComputer(req.session.managerId)
        const availableClients = await getAvailableClients(req.session.managerId)

        return renderComputerBoard(res, computers, {
            editComputerId: computerId,
            editErrors: result.error.flatten().fieldErrors,
            editOld: req.body,
            availableClients
        })
    }

    try {
        const computer = await prisma.computer.findFirst({
            where: {
                id: computerId,
                managerId: req.session.managerId
            }
        })

        if (!computer) {
            return res.redirect("/computerboard")
        }

        await prisma.computer.update({
            where: {
                id: computer.id
            },
            data: {
                name: result.data.name,
                macAddress: result.data.macAddress
            }
        })

        return res.redirect("/computerboard")
    } catch (error) {
        console.error(error)

        const computers = await getManagerComputer(req.session.managerId)
        const availableClients = await getAvailableClients(req.session.managerId)

        return renderComputerBoard(res, computers, {
            editComputerId: computerId,
            editErrors: { general: ["Une erreur est survenue pendant la modification du poste."] },
            editOld: req.body,
            availableClients
        })
    }
})

// Supprime un poste et ses reservations liees dans une transaction.
computerRouter.post("/computer/:computerId/delete", authguard, async (req, res) => {
    const computerId = parseInt(req.params.computerId)

    if (Number.isNaN(computerId)) {
        return res.redirect("/computerboard")
    }

    try {
        const computer = await prisma.computer.findFirst({
            where: {
                id: computerId,
                managerId: req.session.managerId
            }
        })

        if (!computer) {
            return res.redirect("/computerboard")
        }

        // Les reservations sont supprimees avant le poste pour respecter les
        // contraintes de relations Prisma/MySQL.
        await prisma.$transaction([
            prisma.reservation.deleteMany({
                where: {
                    computerId: computer.id,
                    managerId: req.session.managerId
                }
            }),
            prisma.computer.delete({
                where: {
                    id: computer.id
                }
            })
        ])

        return res.redirect("/computerboard")
    } catch (error) {
        console.error(error)
        return res.redirect("/computerboard")
    }
})

// Assigne un client disponible a un poste du manager.
computerRouter.post("/computer/:computerId/assign-client", authguard, async (req, res) => {
    const computerId = parseInt(req.params.computerId)
    const clientId = parseInt(req.body.clientId)

    if (Number.isNaN(computerId) || Number.isNaN(clientId)) {
        return res.redirect("/computerboard")
    }

    try {
        const computer = await prisma.computer.findFirst({
            where: {
                id: computerId,
                managerId: req.session.managerId
            }
        })

        const client = await prisma.client.findFirst({
            where: {
                id: clientId,
                managerId: req.session.managerId,
                computer: {
                    is: null
                }
            }
        })

        // Si le poste ou le client ne correspond pas au manager, on ignore la
        // demande au lieu de modifier des donnees hors perimetre.
        if (!computer || !client) {
            return res.redirect("/computerboard")
        }

        await prisma.computer.update({
            where: {
                id: computer.id
            },
            data: {
                clientId: client.id
            }
        })

        return res.redirect("/computerboard")
    } catch (error) {
        console.error(error)
        return res.redirect("/computerboard")
    }
})

// Libere le poste sans supprimer le client.
computerRouter.post("/computer/:computerId/release-client", authguard, async (req, res) => {
    const computerId = parseInt(req.params.computerId)

    if (Number.isNaN(computerId)) {
        return res.redirect("/computerboard")
    }

    try {
        // updateMany evite une exception si l'id existe mais n'appartient pas
        // au manager connecte: aucune ligne ne sera modifiee.
        await prisma.computer.updateMany({
            where: {
                id: computerId,
                managerId: req.session.managerId
            },
            data: {
                clientId: null
            }
        })

        return res.redirect("/computerboard")
    } catch (error) {
        console.error(error)
        return res.redirect("/computerboard")
    }
})

// Marque un poste comme repare et efface la raison de panne.
computerRouter.post("/computer/:computerId/repair", authguard, async (req, res) => {
    const computerId = parseInt(req.params.computerId)
    // La meme action peut venir du dashboard ou du tableau postes.
    const redirectTo = req.body.redirectTo === "/dashboard" ? "/dashboard" : "/computerboard"

    if (Number.isNaN(computerId)) {
        return res.redirect(redirectTo)
    }

    try {
        await prisma.computer.updateMany({
            where: {
                id: computerId,
                managerId: req.session.managerId
            },
            data: {
                isBroken: false,
                brokenReason: null
            }
        })

        return res.redirect(redirectTo)
    } catch (error) {
        console.error(error)
        return res.redirect(redirectTo)
    }
})

export default computerRouter
