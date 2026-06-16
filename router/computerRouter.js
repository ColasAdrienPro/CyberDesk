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

    renderComputerBoard(res, computers)
})

computerRouter.post("/computerboard", authguard, async (req, res) => {
    const result = computerSchema.safeParse(req.body)

    if (!result.success) {
        const computers = await getManagerComputer(req.session.managerId)

        return renderComputerBoard(res, computers, {
            errors: result.error.flatten().fieldErrors,
            old: req.body
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

        return renderComputerBoard(res, computers, {
            errors: { general: ["Une erreur est survenue pendant l'ajout du poste."] },
            old: req.body
        })
    }
})

export default computerRouter
