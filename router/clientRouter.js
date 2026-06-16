import { Router } from "express"
import { hash } from "bcrypt"
import { prisma } from "../db.js"
import { authguard } from "../middlewares/authguard.js"
import clientSchema from "../validations/clientValidation.js"

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

clientRouter.get("/clientboard", authguard, async (req, res) => {
    const clients = await getManagerClients(req.session.managerId)

    res.render("pages/clientboard.twig", {
        clients
    })
})

clientRouter.post("/clientboard", authguard, async (req, res) => {
    const result = clientSchema.safeParse(req.body)

    if (!result.success) {
        const clients = await getManagerClients(req.session.managerId)

        return res.render("pages/clientboard.twig", {
            errors: result.error.flatten().fieldErrors,
            old: req.body,
            clients
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

        return res.render("pages/clientboard.twig", {
            errors: { general: ["Une erreur est survenue pendant l'inscription."] },
            old: req.body,
            clients
        })
    }
})

export default clientRouter
