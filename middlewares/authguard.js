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
