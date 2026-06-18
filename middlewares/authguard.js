import { prisma } from "../db.js"

// Protege les pages manager. Si l'id de session correspond encore a un
// manager existant, on l'attache a req.manager pour les routes suivantes.
export const authguard = async (req, res, next) => {
    if (req.session.managerId) {
        const manager = await prisma.manager.findUnique({
            where: {
                id: parseInt(req.session.managerId)
            }
        })
        if (manager) {
            req.manager = manager
            return next()
        }
        res.redirect("/login")
    } else {
        res.redirect("/login")
    }
}

// Protege les pages client. On charge aussi le manager et le poste lie afin
// que les dashboards clients puissent afficher ces informations sans refaire
// une requete dans chaque route.
export const clientAuthguard = async (req, res, next) => {
    if (req.session.clientId) {
        const client = await prisma.client.findUnique({
            where: {
                id: parseInt(req.session.clientId)
            },
            include: {
                manager: true,
                computer: true
            }
        })
        if (client) {
            req.client = client
            return next()
        }
        res.redirect("/login-client")
    } else {
        res.redirect("/login-client")
    }
}
