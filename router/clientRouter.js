import { Router } from "express"
import { compare, hash } from "bcrypt"
import { prisma } from "../db.js"
import { authguard } from "../middlewares/authguard.js"

const clientRouter = Router()

clientRouter.get("/addclient", authguard, (req,res)=>{
    res.render("pages/addclient.twig")
})