import { prisma } from "../db.js"

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
