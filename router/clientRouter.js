import { Router } from "express"
import { compare, hash } from "bcrypt"
import { prisma } from "../db.js"
import { authguard, clientAuthguard } from "../middlewares/authguard.js"
import clientSchema, { clientUpdateSchema } from "../validations/clientValidation.js"

const clientRouter = Router()

const getManagerClients = (managerId, filters = {}) => {
    const search = filters.search?.trim()
    const status = filters.status
    const gender = filters.gender

    const where = {
        managerId
    }

    if (search) {
        where.OR = [
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

    if (status === "assigned") {
        where.computer = {
            isNot: null
        }
    }

    if (status === "unassigned") {
        where.computer = {
            is: null
        }
    }

    if (gender) {
        where.gender = gender
    }

    return prisma.client.findMany({
        where,
        include: {
            computer: true
        },
        orderBy: {
            id: "desc"
        }
    })
}

const renderClientBoard = (res, clients, viewData = {}) => {
    return res.render("pages/clientboard.twig", {
        clients,
        ...viewData
    })
}

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

clientRouter.get("/dashboardClient", clientAuthguard, async (req, res) => {
    renderClientDashboard(res, req.client)
})

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

clientRouter.get("/logout-client", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login-client")
    })
})

clientRouter.get("/clientboard", authguard, async (req, res) => {
    const filters = {
        search: req.query.search ?? "",
        status: req.query.status ?? "",
        gender: req.query.gender ?? ""
    }
    const clients = await getManagerClients(req.session.managerId, filters)

    renderClientBoard(res, clients, {
        filters
    })
})

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

        const data = {
            firstname: result.data.firstname,
            lastname: result.data.lastname,
            email: result.data.email,
            age: result.data.age ?? null,
            gender: result.data.gender ?? null
        }

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

        await prisma.$transaction([
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
