import express from "express"
import session from "express-session"
import "dotenv/config"
import managerRouter from "./router/managerRouter.js"

const app = express()

app.use(express.static("./public"))
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use((req, res, next) => {
    res.locals.isLogged = Boolean(req.session.managerId)
    res.locals.currentPath = req.path
    next()
})

app.use(managerRouter)

app.listen(process.env.PORT, (err)=>{
    if (err) {
        console.log(err);
    }else {
        console.log(`connectée sur le Port ${process.env.PORT}`);
    }
})
