import { Router } from "express"
import { prisma } from "../db.js"
import { authguard } from "../middlewares/authguard.js"
import computerSchema from "../validations/computerValidation.js"

const computerRouter = Router()

const getManagerComputer = (managerId) => {
    return prisma.computer.findMany({
        where: {
            managerId
        },
        include: {
            client: true
        },
        orderBy: {
            id: "desc"
        }
    })
}

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

const renderComputerBoard = (res, computers, viewData = {}) => {
    const availableComputers = computers.filter((computer) => !computer.client).length

    return res.render("pages/computerboard.twig", {
        computers,
        availableComputers,
        occupiedComputers: computers.length - availableComputers,
        ...viewData
    })
}

computerRouter.get("/computerboard", authguard, async (req, res) => {
    const computers = await getManagerComputer(req.session.managerId)
    const availableClients = await getAvailableClients(req.session.managerId)

    renderComputerBoard(res, computers, {
        availableClients
    })
})

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

computerRouter.post("/computer/:computerId/delete", authguard, async (req, res) => {
    const computerId = parseInt(req.params.computerId)

    if (Number.isNaN(computerId)) {
        return res.redirect("/computerboard")
    }

    try {
        await prisma.computer.deleteMany({
            where: {
                id: computerId,
                managerId: req.session.managerId
            }
        })

        return res.redirect("/computerboard")
    } catch (error) {
        console.error(error)
        return res.redirect("/computerboard")
    }
})

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

computerRouter.post("/computer/:computerId/release-client", authguard, async (req, res) => {
    const computerId = parseInt(req.params.computerId)

    if (Number.isNaN(computerId)) {
        return res.redirect("/computerboard")
    }

    try {
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

export default computerRouter
