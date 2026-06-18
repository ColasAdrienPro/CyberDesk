import { Router } from "express"
import { compare, hash } from "bcrypt"
import { prisma } from "../db.js"
import { authguard, clientAuthguard } from "../middlewares/authguard.js"
import clientSchema, { clientUpdateSchema } from "../validations/clientValidation.js"

// Router responsable du login client, de son dashboard et du CRUD clients
// cote manager.
const clientRouter = Router()

// Liste les clients du manager connecte sans exposer ceux d'un autre cybercafe.
const getManagerClients = (managerId) => {
    return prisma.client.findMany({
        where: {
            managerId
        },
        include: {
            computer: true
        },
        orderBy: {
            id: "desc"
        }
    })
}

// Rend la page de gestion clients avec les donnees optionnelles d'erreurs ou
// de formulaire en cours d'edition.
const renderClientBoard = (res, clients, viewData = {}) => {
    return res.render("pages/clientboard.twig", {
        clients,
        ...viewData
    })
}

// Centralise le rendu dashboard client pour reutiliser la meme vue apres une
// erreur de signalement de panne ou un affichage normal.
const renderClientDashboard = (res, client, viewData = {}) => {
    return res.render("pages/dashboardClient.twig", {
        client,
        manager: client.manager,
        computer: client.computer,
        ...viewData
    })
}

clientRouter.get("/login-client", (req, res) => {
    res.render("pages/loginClient.twig")
})

// Authentifie un client avec email + mot de passe et ouvre une session client.
clientRouter.post("/login-client", async (req, res) => {
    try {
        if (!req.body.email || !req.body.password) {
            throw new Error("Email et mot de passe requis")
        }

        const client = await prisma.client.findUnique({
            where: {
                email: req.body.email
            }
        })

        if (!client) {
            throw new Error("Identifiants incorrects")
        }

        const isPasswordValid = await compare(req.body.password, client.password)

        if (!isPasswordValid) {
            throw new Error("Identifiants incorrects")
        }

        // Les deux roles sont exclusifs dans la meme session.
        req.session.clientId = client.id
        req.session.managerId = null
        return res.redirect("/dashboardClient")
    } catch (error) {
        return res.render("pages/loginClient.twig", {
            errors: error.message,
            old: req.body
        })
    }
})

// Affiche l'espace personnel du client connecte.
clientRouter.get("/dashboardClient", clientAuthguard, async (req, res) => {
    renderClientDashboard(res, req.client)
})

// Permet au client de signaler que son poste assigne est en panne.
clientRouter.post("/dashboardClient/computer/report-broken", clientAuthguard, async (req, res) => {
    if (!req.client.computer) {
        return res.redirect("/dashboardClient")
    }

    const brokenReason = req.body.brokenReason?.trim()

    if (!brokenReason || brokenReason.length < 3) {
        return renderClientDashboard(res, req.client, {
            reportError: "Merci d'indiquer une raison d'au moins 3 caracteres.",
            reportOld: {
                brokenReason: req.body.brokenReason
            }
        })
    }

    if (brokenReason.length > 500) {
        return renderClientDashboard(res, req.client, {
            reportError: "La raison ne doit pas depasser 500 caracteres.",
            reportOld: {
                brokenReason: req.body.brokenReason
            }
        })
    }

    try {
        // updateMany ajoute une securite: le poste doit bien appartenir au
        // client connecte, sinon aucune ligne n'est modifiee.
        await prisma.computer.updateMany({
            where: {
                id: req.client.computer.id,
                clientId: req.client.id
            },
            data: {
                isBroken: true,
                brokenReason
            }
        })

        return res.redirect("/dashboardClient")
    } catch (error) {
        console.error(error)
        return res.redirect("/dashboardClient")
    }
})

// Ferme la session client.
clientRouter.get("/logout-client", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login-client")
    })
})

// Liste les clients du manager.
clientRouter.get("/clientboard", authguard, async (req, res) => {
    const clients = await getManagerClients(req.session.managerId)

    renderClientBoard(res, clients)
})

// Ajoute un client rattache au manager connecte.
clientRouter.post("/clientboard", authguard, async (req, res) => {
    const result = clientSchema.safeParse(req.body)

    if (!result.success) {
        const clients = await getManagerClients(req.session.managerId)

        return renderClientBoard(res, clients, {
            errors: result.error.flatten().fieldErrors,
            old: req.body
        })
    }

    try {
        // Le mot de passe client est hashe exactement comme celui du manager.
        const hashedpassword = await hash(result.data.password, parseInt(process.env.SALT))

        await prisma.client.create({
            data: {
                firstname: result.data.firstname,
                lastname: result.data.lastname,
                email: result.data.email,
                password: hashedpassword,
                age: result.data.age,
                gender: result.data.gender,
                managerId: req.session.managerId
            }
        })

        return res.redirect("/clientboard")
    } catch (error) {
        console.error(error)

        const clients = await getManagerClients(req.session.managerId)

        return renderClientBoard(res, clients, {
            errors: { general: ["Une erreur est survenue pendant l'inscription."] },
            old: req.body
        })
    }
})

// Modifie un client existant apres verification qu'il appartient au manager.
clientRouter.post("/client/:clientId/update", authguard, async (req, res) => {
    const clientId = parseInt(req.params.clientId)

    if (Number.isNaN(clientId)) {
        return res.redirect("/clientboard")
    }

    const result = clientUpdateSchema.safeParse(req.body)

    if (!result.success) {
        const clients = await getManagerClients(req.session.managerId)

        return renderClientBoard(res, clients, {
            editClientId: clientId,
            editErrors: result.error.flatten().fieldErrors,
            editOld: req.body
        })
    }

    try {
        const existingClient = await prisma.client.findFirst({
            where: {
                id: clientId,
                managerId: req.session.managerId
            }
        })

        if (!existingClient) {
            return res.redirect("/clientboard")
        }

        // On prepare uniquement les champs modifiables depuis le formulaire.
        const data = {
            firstname: result.data.firstname,
            lastname: result.data.lastname,
            email: result.data.email,
            age: result.data.age ?? null,
            gender: result.data.gender ?? null
        }

        // Mot de passe facultatif en edition: absent = conservation de l'ancien.
        if (result.data.password) {
            data.password = await hash(result.data.password, parseInt(process.env.SALT))
        }

        await prisma.client.update({
            where: {
                id: existingClient.id
            },
            data
        })

        return res.redirect("/clientboard")
    } catch (error) {
        console.error(error)

        const clients = await getManagerClients(req.session.managerId)

        return renderClientBoard(res, clients, {
            editClientId: clientId,
            editErrors: { general: ["Une erreur est survenue pendant la modification du client."] },
            editOld: req.body
        })
    }
})

// Supprime un client et nettoie ses liens dependants dans une transaction.
clientRouter.post("/client/:clientId/delete", authguard, async (req, res) => {
    const clientId = parseInt(req.params.clientId)

    if (Number.isNaN(clientId)) {
        return res.redirect("/clientboard")
    }

    try {
        const existingClient = await prisma.client.findFirst({
            where: {
                id: clientId,
                managerId: req.session.managerId
            }
        })

        if (!existingClient) {
            return res.redirect("/clientboard")
        }

        // La transaction garde la base coherente: reservations supprimees,
        // poste libere, puis client supprime.
        await prisma.$transaction([
            prisma.reservation.deleteMany({
                where: {
                    clientId: existingClient.id,
                    managerId: req.session.managerId
                }
            }),
            prisma.computer.updateMany({
                where: {
                    clientId: existingClient.id,
                    managerId: req.session.managerId
                },
                data: {
                    clientId: null
                }
            }),
            prisma.client.delete({
                where: {
                    id: existingClient.id
                }
            })
        ])

        return res.redirect("/clientboard")
    } catch (error) {
        console.error(error)
        return res.redirect("/clientboard")
    }
})

export default clientRouter
