import { Router } from "express"
import { compare, hash } from "bcrypt"
import { prisma } from "../db.js"
import { authguard } from "../middlewares/authguard.js"
import managerSchema from "../validations/managerValidations.js"

const managerRouter = Router()

managerRouter.get("/", (req, res) => {
    res.redirect("/subscribe")
})

managerRouter.get("/subscribe", (req, res) => {
    res.render("pages/subscribe.twig")
})

managerRouter.post("/subscribe", async (req, res) => {
    const result = managerSchema.safeParse(req.body)

    if (!result.success) {
        return res.render("pages/subscribe.twig", {
            errors: result.error.flatten().fieldErrors,
            old: req.body
        })
    }

    try {
        const hashedpassword = await hash(result.data.password, parseInt(process.env.SALT))

        await prisma.manager.create({
            data: {
                cyberCafeName: result.data.cyberCafeName,
                siret: result.data.siret,
                password: hashedpassword,
                managerName: result.data.managerName
            }
        })

        return res.redirect("/login")

    } catch (error) {
        console.error(error)

        return res.render("pages/subscribe.twig", {
            errors: { general: ["Une erreur est survenue pendant l'inscription."] },
            old: req.body
        })
    }
})

managerRouter.get("/login", (req, res) => {
    res.render("pages/login.twig")
})

managerRouter.post("/login", async (req, res) => {
    try {
        const manager = await prisma.manager.findUnique({
            where: {
                siret: req.body.siret
            }
        })
        if (!manager) {
            throw new Error("Identifiants incorrect")
        }

        const ispasswordvalid = await compare(req.body.password, manager.password)

        if (!ispasswordvalid) {
            throw new Error("Mot de passe incorrect")
        }

        req.session.managerId = manager.id
        res.redirect("/dashboard")
    } catch (error) {
        console.log(error);
        res.render("pages/login.twig", {
            errors: error.message
        })

    }
})

managerRouter.get("/dashboard", authguard, async (req,res)=>{
    const manager = await prisma.manager.findUnique({
        where: {
            id: req.session.managerId
        },
        include: {
            clients: true,
            computers: true
        }
    })

    if (!manager) {
        req.session.destroy(() =>{
            res.redirect("/login")
        })
        return
    }

    res.render("pages/dashboard.twig", {
        manager,
        clients: manager.clients,
        computers: manager.computers
    })
})

managerRouter.get("/logout", (req,res)=>{
    req.session.destroy(() => {
        res.redirect("/login")
    })
})

export default managerRouter
