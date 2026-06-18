import express from "express"
import session from "express-session"
import "dotenv/config"
import managerRouter from "./router/managerRouter.js"
import clientRouter from "./router/clientRouter.js"
import computerRouter from "./router/computerRouter.js"
import reservationRouter from "./router/reservationRouter.js"

// Cree l'application Express principale. Tous les middlewares et routers
// sont ensuite branches sur cette instance.
const app = express()

// Rend accessibles les fichiers statiques places dans /public
// (CSS compile Tailwind, JS navigateur, images, vendor FullCalendar).
app.use(express.static("./public"))

// Decode les formulaires HTML classiques et les requetes JSON envoyees
// par le calendrier de reservations.
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Stocke l'identite connectee cote serveur. Le secret vient du .env.
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

// Expose des variables globales dans Twig pour afficher le bon menu
// selon le type d'utilisateur connecte et la route courante.
app.use((req, res, next) => {
    res.locals.isLogged = Boolean(req.session.managerId)
    res.locals.isClientLogged = Boolean(req.session.clientId)
    res.locals.currentPath = req.path
    next()
})

// Branche les modules de routes. L'ordre reste simple car chaque router
// declare des chemins explicites.
app.use(managerRouter)
app.use(clientRouter)
app.use(computerRouter)
app.use(reservationRouter)

// Demarre le serveur HTTP sur le port configure dans .env.
app.listen(process.env.PORT, (err)=>{
    if (err) {
        console.log(err);
    }else {
        console.log(`connectée sur le Port ${process.env.PORT}`);
    }
})
