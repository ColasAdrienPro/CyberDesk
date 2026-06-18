import { Router } from "express"
import { hash } from "bcrypt"
import { prisma } from "../db.js"
import { authguard } from "../middlewares/authguard.js"
import clientSchema, { clientUpdateSchema } from "../validations/clientValidation.js"

const clientRouter = Router()

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

const renderClientBoard = (res, clients, viewData = {}) => {
    return res.render("pages/clientboard.twig", {
        clients,
        ...viewData
    })
}

clientRouter.get("/clientboard", authguard, async (req, res) => {
    const clients = await getManagerClients(req.session.managerId)

    renderClientBoard(res, clients)
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
