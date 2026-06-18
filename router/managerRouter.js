import { Router } from "express"
import { compare, hash } from "bcrypt"
import { prisma } from "../db.js"
import { authguard } from "../middlewares/authguard.js"
import managerSchema from "../validations/managerValidations.js"

// Router responsable de l'inscription, connexion, tableau de bord et
// deconnexion des gerants.
const managerRouter = Router()

// Redirige la racine vers l'inscription pour servir de page d'entree.
managerRouter.get("/", (req, res) => {
    res.redirect("/subscribe")
})

managerRouter.get("/subscribe", (req, res) => {
    res.render("pages/subscribe.twig")
})

// Cree un manager apres validation Zod et hash du mot de passe.
managerRouter.post("/subscribe", async (req, res) => {
    const result = managerSchema.safeParse(req.body)

    if (!result.success) {
        return res.render("pages/subscribe.twig", {
            errors: result.error.flatten().fieldErrors,
            old: req.body
        })
    }

    try {
        // Le hash bcrypt evite de stocker le mot de passe en clair.
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

// Authentifie un gerant par SIRET + mot de passe, puis initialise la session.
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

        // Une session ne doit jamais etre a la fois manager et client.
        req.session.managerId = manager.id
        req.session.clientId = null
        res.redirect("/dashboard")
    } catch (error) {
        console.log(error);
        res.render("pages/login.twig", {
            errors: error.message
        })

    }
})

// Charge les donnees resumees du manager pour alimenter les widgets du dashboard.
managerRouter.get("/dashboard", authguard, async (req, res) => {
    const manager = await prisma.manager.findUnique({
        where: {
            id: req.session.managerId
        },
        include: {
            clients: {
                orderBy: {
                    id: "desc"
                }
            },
            computers: {
                include: {
                    client: true
                },
                orderBy: {
                    id: "asc"
                }
            }
        }
    })

    if (!manager) {
        req.session.destroy(() => {
            res.redirect("/login")
        })
        return
    }

    // Ces listes derivent de manager.computers et evitent de recalculer les
    // compteurs directement dans la vue Twig.
    const brokenComputers = manager.computers.filter((computer) => computer.isBroken)
    const occupiedComputers = manager.computers.filter((computer) => !computer.isBroken && computer.client)
    const availableComputers = manager.computers.filter((computer) => !computer.isBroken && !computer.client)

    res.render("pages/dashboard.twig", {
        manager,
        clients: manager.clients,
        recentClients: manager.clients.slice(0, 5),
        computers: manager.computers,
        brokenComputers,
        occupiedComputers,
        availableComputers,
        dashboardStats: {
            totalComputers: manager.computers.length,
            activeSessions: occupiedComputers.length,
            brokenComputers: brokenComputers.length,
            totalClients: manager.clients.length
        }
    })
})

// Detruit la session Express et force une nouvelle authentification.
managerRouter.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login")
    })
})

export default managerRouter
