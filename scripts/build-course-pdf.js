import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const outputPath = path.join(root, "docs", "cours-complet-cyberdesk.pdf")

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")

const snippets = {
    server: read("server.js"),
    db: read("db.js"),
    authguard: read("middlewares/authguard.js"),
    reservationModel: read("prisma/reservation.prisma"),
    reservationRouter: read("router/reservationRouter.js"),
    reservationCalendar: read("public/assets/js/reservationCalendar.js"),
    reservationsTwig: read("views/pages/reservations.twig"),
    reservationsClientTwig: read("views/pages/reservationsClient.twig")
}

const normalize = (value) => value
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "    ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "")

const pickLines = (text, start, end) => text.split("\n").slice(start - 1, end).join("\n")

const doc = [
    { type: "title", text: "Cours complet CyberDesk" },
    { type: "subtitle", text: "Comprendre un projet Express, Twig, Prisma, MySQL, Tailwind et FullCalendar en partant de zero" },
    { type: "meta", text: "Projet: CyberDesk - Date: 18 juin 2026 - Niveau: grand debutant" },
    { type: "callout", text: "Objectif du cours: etre capable d'ouvrir le projet, reconnaitre le role de chaque fichier, suivre une requete depuis le navigateur jusqu'a la base de donnees, puis corriger une erreur sans paniquer." },

    { type: "h1", text: "1. Comment lire ce cours" },
    { type: "p", text: "Ce document part du principe que vous n'avez jamais touche au code. Il explique les mots, les fichiers et les mouvements de donnees. Il ne cherche pas seulement a dire quoi modifier: il explique pourquoi chaque bloc existe." },
    { type: "p", text: "Lisez dans cet ordre: vocabulaire, architecture, serveur, base de donnees, routes, vues Twig, JavaScript du calendrier, puis exercices. Quand vous voyez un bloc de code, commencez par lire le commentaire au-dessus, puis les noms de variables, puis seulement les details." },
    { type: "bullets", items: [
        "Un fichier est comme une fiche de travail specialisee.",
        "Une fonction est une recette: elle recoit des ingredients, fait des etapes, puis renvoie un resultat.",
        "Une route Express est une porte d'entree HTTP: elle repond a une URL.",
        "Une table Prisma represente une table SQL dans la base de donnees.",
        "Une vue Twig est un modele HTML rempli avec des donnees venant du serveur.",
        "Un script public JavaScript agit dans le navigateur apres le chargement de la page."
    ] },

    { type: "h1", text: "2. Vue d'ensemble de CyberDesk" },
    { type: "p", text: "CyberDesk est une application web de gestion de cybercafe. Un gerant peut creer des clients, enregistrer des ordinateurs, assigner des postes, suivre les pannes et gerer les reservations. Un client peut se connecter, voir son espace et demander un creneau de reservation." },
    { type: "h2", text: "Le chemin d'une action utilisateur" },
    { type: "steps", items: [
        "L'utilisateur clique ou envoie un formulaire dans son navigateur.",
        "Le navigateur demande une URL au serveur Express.",
        "Express choisit la bonne route dans un router.",
        "La route verifie la session, les donnees et les droits.",
        "La route lit ou modifie la base avec Prisma.",
        "Le serveur repond avec une page Twig ou du JSON.",
        "Le navigateur affiche le resultat ou met a jour le calendrier."
    ] },
    { type: "h2", text: "Carte mentale du projet" },
    { type: "code", text: `CyberDesk/
  server.js                         Point d'entree Express
  db.js                             Connexion Prisma / MariaDB
  middlewares/authguard.js          Protections manager et client
  router/*.js                       Routes HTTP de chaque domaine
  validations/*.js                  Regles Zod des formulaires
  prisma/*.prisma                   Modeles de base de donnees
  views/**/*.twig                   Pages HTML dynamiques
  public/assets/js/*.js             JavaScript execute dans le navigateur
  public/assets/css/tailwind.css    Source Tailwind
  public/assets/css/style.css       CSS genere par Tailwind` },

    { type: "h1", text: "3. Les technologies, sans jargon inutile" },
    { type: "h2", text: "Express" },
    { type: "p", text: "Express est le serveur web. Il ecoute des requetes comme GET /dashboard ou POST /login. Il decide quoi faire et quoi renvoyer." },
    { type: "h2", text: "Twig" },
    { type: "p", text: "Twig fabrique du HTML avec des variables. Exemple: {{ manager.cyberCafeName }} affiche le nom du cybercafe recu depuis la route." },
    { type: "h2", text: "Prisma" },
    { type: "p", text: "Prisma est la couche qui parle a MySQL/MariaDB avec du JavaScript. Au lieu d'ecrire directement SELECT * FROM Client, le code ecrit prisma.client.findMany(...)." },
    { type: "h2", text: "Zod" },
    { type: "p", text: "Zod verifie les formulaires. Il empeche d'enregistrer des emails invalides, des mots de passe trop faibles ou des dates impossibles." },
    { type: "h2", text: "Tailwind" },
    { type: "p", text: "Tailwind fournit des classes CSS directement dans les templates, par exemple rounded-lg, bg-white ou text-sm. Le fichier style.css est genere, il ne faut pas le modifier a la main." },
    { type: "h2", text: "FullCalendar" },
    { type: "p", text: "FullCalendar affiche le planning. Dans CyberDesk, il lit les reservations via des endpoints JSON et permet de supprimer ou visualiser des evenements." },

    { type: "h1", text: "4. Le point d'entree: server.js" },
    { type: "p", text: "server.js est la premiere piece a lire. Il cree l'application Express, branche les middlewares, expose les variables Twig globales, ajoute les routers, puis demarre le serveur." },
    { type: "code", text: snippets.server },
    { type: "h2", text: "Lecture bloc par bloc" },
    { type: "bullets", items: [
        "Les imports chargent Express, la session, dotenv et les routers.",
        "const app = express() cree l'application.",
        "express.static('./public') rend les fichiers CSS, JS et images accessibles.",
        "express.urlencoded(...) lit les formulaires HTML classiques.",
        "express.json() lit les requetes JSON envoyees par fetch.",
        "session(...) garde l'identite connectee entre deux pages.",
        "res.locals expose des variables a toutes les vues Twig.",
        "app.use(router) branche les groupes de routes.",
        "app.listen(...) demarre le serveur sur le port du fichier .env."
    ] },
    { type: "callout", text: "A corriger si une page ne voit pas isLogged ou currentPath: regarder le middleware res.locals dans server.js. A corriger si une API JSON ne lit pas req.body: verifier app.use(express.json())." },

    { type: "h1", text: "5. La base de donnees avec db.js et Prisma" },
    { type: "p", text: "Le fichier db.js centralise la connexion a MariaDB. Tous les routers importent la meme variable prisma. Cela evite de recreer une connexion dans chaque fichier." },
    { type: "code", text: snippets.db },
    { type: "h2", text: "A retenir" },
    { type: "bullets", items: [
        "process.env.DB_HOST lit une variable du fichier .env.",
        "Number(process.env.DB_PORT) transforme le port texte en nombre.",
        "PrismaMariaDb est l'adapter utilise par Prisma 7 pour MariaDB.",
        "new PrismaClient({ adapter }) cree l'objet qui fera les requetes.",
        "export const prisma permet aux autres fichiers de l'importer."
    ] },

    { type: "h1", text: "6. Les modeles Prisma" },
    { type: "p", text: "Les fichiers .prisma decrivent la structure des donnees. Chaque model correspond a une table. Chaque champ correspond a une colonne. Les relations disent comment les tables sont reliees." },
    { type: "h2", text: "Reservation" },
    { type: "code", text: snippets.reservationModel },
    { type: "h2", text: "Traduction ligne par ligne du modele Reservation" },
    { type: "bullets", items: [
        "id: identifiant unique genere automatiquement.",
        "startAt et endAt: debut et fin du creneau.",
        "status: PENDING par defaut, puis APPROVED apres validation.",
        "createdAt: date de creation automatique.",
        "managerId, clientId, computerId: cles etrangeres vers les autres tables.",
        "@relation indique a Prisma comment relier les objets.",
        "@@index accelere les recherches par manager, client ou ordinateur et date."
    ] },
    { type: "callout", text: "Quand vous ajoutez un champ Prisma, il faut souvent: modifier le schema, creer/appliquer une migration, puis lancer npx prisma generate pour que le client Prisma connaisse le nouveau champ." },

    { type: "h1", text: "7. Les sessions et protections" },
    { type: "p", text: "Une session est une memoire cote serveur. Apres connexion, on y stocke managerId ou clientId. Les guards verifient ensuite si l'utilisateur a le droit d'entrer sur une page." },
    { type: "code", text: snippets.authguard },
    { type: "h2", text: "Pourquoi deux guards ?" },
    { type: "bullets", items: [
        "authguard protege les pages du gerant.",
        "clientAuthguard protege les pages du client.",
        "Chaque guard recharge l'utilisateur depuis la base.",
        "Si l'utilisateur n'existe plus, on redirige vers la page de login.",
        "req.manager ou req.client sert ensuite aux routes protegees."
    ] },

    { type: "h1", text: "8. Les routes: penser en URL + methode" },
    { type: "p", text: "Une route Express est definie par une methode HTTP et une URL. GET sert surtout a afficher ou lire. POST sert souvent a creer. PATCH sert a modifier partiellement. DELETE sert a supprimer." },
    { type: "h2", text: "Exemple mental" },
    { type: "code", text: `reservationRouter.get("/reservations", authguard, async (req, res) => {
  res.render("pages/reservations.twig", { manager: req.manager })
})` },
    { type: "bullets", items: [
        "GET: le navigateur demande la page.",
        "\"/reservations\": URL demandee.",
        "authguard: controle que le gerant est connecte.",
        "async (req, res): fonction qui traite la demande.",
        "res.render(...): fabrique une page HTML Twig."
    ] },

    { type: "h1", text: "9. Le routeur de reservations" },
    { type: "p", text: "Ce routeur est le coeur du systeme de planning. Il contient les pages HTML et les API JSON utilisees par le calendrier." },
    { type: "h2", text: "Debut du fichier" },
    { type: "code", text: pickLines(snippets.reservationRouter, 1, 47) },
    { type: "h2", text: "Explication" },
    { type: "bullets", items: [
        "reservationStatus evite d'ecrire des chaines magiques partout.",
        "isValidDate verifie qu'une date JavaScript est correcte.",
        "getOverlappingReservation detecte les conflits de planning.",
        "formatReservationEvent transforme une reservation Prisma en evenement FullCalendar.",
        "formatPendingReservation prepare un format plus court pour la liste des demandes."
    ] },
    { type: "h2", text: "La logique de chevauchement" },
    { type: "p", text: "Deux creneaux se chevauchent si le debut du premier est avant la fin du second ET si la fin du premier est apres le debut du second. C'est la formule la plus importante du calendrier." },
    { type: "code", text: `startAt: { lt: endAt },
endAt: { gt: startAt }` },
    { type: "callout", text: "Pour corriger un bug de double reservation, commencez toujours par getOverlappingReservation. C'est le garde-fou qui decide si un poste est deja pris." },

    { type: "h2", text: "Creer une demande client" },
    { type: "code", text: pickLines(snippets.reservationRouter, 154, 216) },
    { type: "bullets", items: [
        "Le client envoie computerId, start et end.",
        "La route transforme les valeurs en nombres et dates.",
        "La route refuse un creneau invalide ou passe.",
        "La route verifie que le poste appartient au manager du client.",
        "La route refuse les conflits avec des reservations approuvees.",
        "La route cree une reservation PENDING.",
        "La route renvoie l'evenement au calendrier en JSON."
    ] },

    { type: "h2", text: "Creer une reservation manager" },
    { type: "code", text: pickLines(snippets.reservationRouter, 218, 291) },
    { type: "p", text: "Le gerant choisit un client et un poste. La reservation est directement APPROVED, car le gerant a le droit de valider sans attente." },

    { type: "h2", text: "Valider une demande" },
    { type: "code", text: pickLines(snippets.reservationRouter, 315, 378) },
    { type: "bullets", items: [
        "On recupere la demande PENDING du manager connecte.",
        "On refuse si elle n'existe pas.",
        "On refuse si le poste est en panne.",
        "On recontrole les chevauchements au dernier moment.",
        "On passe le status a APPROVED."
    ] },
    { type: "callout", text: "Ce recontrole est important: entre la demande du client et la validation, le manager a pu creer une autre reservation. Le serveur doit toujours etre la source de verite." },

    { type: "h1", text: "10. Les vues Twig: transformer des donnees en HTML" },
    { type: "p", text: "Twig ressemble a du HTML avec des trous pour injecter des donnees. Les donnees viennent des res.render(...) dans les routes." },
    { type: "h2", text: "Page reservations manager" },
    { type: "code", text: pickLines(snippets.reservationsTwig, 1, 55) },
    { type: "bullets", items: [
        "{% extends %} dit que la page utilise le layout commun.",
        "{% block main %} remplit la zone principale du layout.",
        "{{ manager.cyberCafeName }} affiche une variable.",
        "id=\"pendingReservationList\" sera rempli par JavaScript.",
        "data-calendar-role=\"manager\" indique au JS quel comportement utiliser."
    ] },
    { type: "h2", text: "Page reservations client" },
    { type: "code", text: pickLines(snippets.reservationsClientTwig, 1, 50) },
    { type: "p", text: "La page client ressemble a la page manager, mais elle ne propose pas de select client. Le serveur sait deja quel client est connecte grace a la session." },

    { type: "h1", text: "11. Le JavaScript du calendrier" },
    { type: "p", text: "Le fichier reservationCalendar.js s'execute dans le navigateur. Il ne parle pas directement a la base de donnees. Il parle au serveur via fetch, puis le serveur parle a Prisma." },
    { type: "h2", text: "Initialisation" },
    { type: "code", text: pickLines(snippets.reservationCalendar, 1, 31) },
    { type: "bullets", items: [
        "DOMContentLoaded attend que le HTML soit charge.",
        "getElementById recupere les elements de la page.",
        "Si le calendrier ou FullCalendar n'existe pas, le script s'arrete.",
        "role decide si on est sur la page client ou manager.",
        "isClient est un booleen: true ou false."
    ] },
    { type: "h2", text: "Messages et requetes JSON" },
    { type: "code", text: pickLines(snippets.reservationCalendar, 33, 77) },
    { type: "p", text: "setMessage affiche les erreurs ou succes. requestJson est un helper fetch: il ajoute les bons headers, parse le JSON, et transforme les erreurs serveur en exceptions JavaScript." },
    { type: "h2", text: "Remplir les listes deroulantes" },
    { type: "code", text: pickLines(snippets.reservationCalendar, 89, 132) },
    { type: "p", text: "Le navigateur demande les postes disponibles. Cote manager, il demande aussi les clients. fillSelect cree ensuite les options HTML." },
    { type: "h2", text: "Construire les dates de reservation" },
    { type: "code", text: pickLines(snippets.reservationCalendar, 190, 215) },
    { type: "p", text: "Le formulaire contient une date, une heure de debut et une duree. Le script calcule start et end. Le serveur reverifie ensuite, car on ne fait jamais confiance uniquement au navigateur." },
    { type: "h2", text: "FullCalendar" },
    { type: "code", text: pickLines(snippets.reservationCalendar, 229, 285) },
    { type: "bullets", items: [
        "locale: 'fr' met le calendrier en francais.",
        "initialView: 'timeGridWeek' affiche la semaine.",
        "events choisit l'API client ou manager.",
        "eventClick gere le clic sur une reservation.",
        "Un client ne peut pas supprimer la reservation d'un autre client.",
        "DELETE supprime cote serveur, puis event.remove() supprime visuellement."
    ] },
    { type: "h2", text: "Soumission du formulaire" },
    { type: "code", text: pickLines(snippets.reservationCalendar, 289, 333) },
    { type: "p", text: "event.preventDefault() empeche le navigateur de recharger la page. Le script envoie une requete POST en JSON, ajoute l'evenement au calendrier, puis affiche un message." },

    { type: "h1", text: "12. Les formulaires et validations Zod" },
    { type: "p", text: "Les formulaires peuvent etre manipules par l'utilisateur. Il faut donc toujours verifier cote serveur. Zod sert a decrire ce qui est accepte." },
    { type: "h2", text: "Schema mental" },
    { type: "code", text: `const result = schema.safeParse(req.body)

if (!result.success) {
  // On renvoie la page avec les erreurs.
}

// result.data est propre et peut etre utilise.` },
    { type: "bullets", items: [
        "safeParse ne fait pas planter le serveur: il renvoie success true ou false.",
        "result.error.flatten().fieldErrors donne les erreurs par champ.",
        "result.data contient les donnees validees et transformees.",
        "Le template Twig affiche les erreurs sous les inputs."
    ] },

    { type: "h1", text: "13. CRUD clients et ordinateurs" },
    { type: "p", text: "CRUD veut dire Create, Read, Update, Delete: creer, lire, modifier, supprimer. Les routers clientRouter.js et computerRouter.js appliquent ce principe." },
    { type: "h2", text: "Les protections importantes" },
    { type: "bullets", items: [
        "Toujours filtrer par managerId pour eviter de toucher les donnees d'un autre cybercafe.",
        "Verifier parseInt(...) avant d'utiliser un id d'URL.",
        "Utiliser updateMany quand on veut ignorer silencieusement une ligne hors perimetre.",
        "Utiliser une transaction quand plusieurs operations doivent rester coherentes.",
        "Supprimer ou detacher les dependances avant de supprimer un client ou un poste."
    ] },
    { type: "code", text: `await prisma.$transaction([
  prisma.reservation.deleteMany({ where: { clientId: existingClient.id } }),
  prisma.computer.updateMany({ where: { clientId: existingClient.id }, data: { clientId: null } }),
  prisma.client.delete({ where: { id: existingClient.id } })
])` },
    { type: "p", text: "Cette transaction evite de laisser des reservations ou des postes lies a un client qui n'existe plus." },

    { type: "h1", text: "14. Comprendre une erreur" },
    { type: "p", text: "Une erreur n'est pas un jugement: c'est une information. Le travail consiste a retrouver a quelle etape la chaine casse." },
    { type: "h2", text: "Methode en 6 questions" },
    { type: "steps", items: [
        "Quelle action a provoque l'erreur ?",
        "Est-ce une page HTML, une API JSON ou une requete base de donnees ?",
        "Quelle URL est appelee ?",
        "Quelle route Express correspond a cette URL ?",
        "Est-ce que req.body, req.params ou req.session contient ce qu'on attend ?",
        "Est-ce que Prisma connait bien les champs utilises ?"
    ] },
    { type: "h2", text: "Exemple: Unknown argument status" },
    { type: "p", text: "Cette erreur signifie souvent que le schema Prisma a change mais que le Prisma Client n'a pas ete regenere. Correction habituelle: npx prisma generate, puis redemarrer le serveur." },
    { type: "code", text: `npx prisma validate
npx prisma migrate deploy
npx prisma generate` },

    { type: "h1", text: "15. Exercices pour apprendre" },
    { type: "h2", text: "Exercice 1: suivre une demande client" },
    { type: "steps", items: [
        "Ouvrir reservationsClient.twig et trouver le formulaire.",
        "Trouver data-calendar-role=\"client\".",
        "Ouvrir reservationCalendar.js et trouver la soumission du formulaire.",
        "Trouver l'URL POST /api/client/reservations.",
        "Ouvrir reservationRouter.js et lire la route correspondante.",
        "Trouver le prisma.reservation.create.",
        "Trouver le status PENDING."
    ] },
    { type: "h2", text: "Exercice 2: ajouter une duree de 4 heures" },
    { type: "p", text: "Cherchez le select reservationDuration dans les deux templates reservations. Ajoutez une option value=\"240\". Le serveur n'a pas besoin de changer car il recoit deja start et end." },
    { type: "h2", text: "Exercice 3: changer la couleur des demandes en attente" },
    { type: "p", text: "Cherchez eventColor dans formatReservationEvent. La couleur orange vient du cas isPending. Modifiez la valeur hexadecimale, puis rechargez la page." },
    { type: "h2", text: "Exercice 4: comprendre une suppression" },
    { type: "p", text: "Cliquez mentalement sur une reservation. Dans reservationCalendar.js, eventClick appelle DELETE. Dans reservationRouter.js, la route deleteMany supprime seulement si l'id appartient au client ou au manager connecte." },

    { type: "h1", text: "16. Glossaire du projet" },
    { type: "terms", items: [
        ["API", "URL qui renvoie des donnees, souvent en JSON, au lieu d'une page complete."],
        ["Middleware", "Fonction Express executee avant une route, par exemple pour verifier la session."],
        ["Session", "Memoire cote serveur qui retient qui est connecte."],
        ["Router", "Fichier qui regroupe plusieurs routes d'un meme domaine."],
        ["Request / req", "La demande recue par le serveur."],
        ["Response / res", "La reponse envoyee par le serveur."],
        ["JSON", "Format de donnees texte utilise entre navigateur et serveur."],
        ["ORM", "Outil qui manipule la base de donnees avec des objets; ici Prisma."],
        ["Migration", "Script qui modifie la structure de la base de donnees."],
        ["Template", "Fichier HTML dynamique, ici Twig."],
        ["Client", "Dans CyberDesk: utilisateur final du cybercafe. En technique: parfois le navigateur."],
        ["Manager", "Gerant du cybercafe, proprietaire des clients, postes et reservations."]
    ] },

    { type: "h1", text: "17. Checklist avant de corriger le projet" },
    { type: "bullets", items: [
        "Lire le message d'erreur complet.",
        "Identifier la route appelee.",
        "Verifier si l'utilisateur est manager ou client.",
        "Verifier req.body pour les formulaires et API.",
        "Verifier les validations Zod.",
        "Verifier les filtres Prisma et les relations.",
        "Verifier que le template utilise les bons ids HTML.",
        "Verifier que le JavaScript cible les bons ids.",
        "Lancer node --check sur le fichier JS modifie.",
        "Lancer npx prisma validate apres modification Prisma."
    ] },

    { type: "h1", text: "18. Commandes utiles" },
    { type: "code", text: `npm install
npm run tailwind
npx prisma validate
npx prisma migrate deploy
npx prisma generate
node --check server.js
node --check router/reservationRouter.js
node --check public/assets/js/reservationCalendar.js` },
    { type: "p", text: "Si une commande echoue, lisez la premiere vraie erreur. Les lignes suivantes sont souvent des consequences." },

    { type: "h1", text: "19. Conclusion" },
    { type: "p", text: "Le projet CyberDesk devient comprehensible quand on suit les responsabilites: server.js branche, les routers decident, les guards protegent, Prisma lit ou ecrit, Twig affiche, le JavaScript dynamise la page. Pour corriger, il faut retrouver dans quelle couche on se trouve." },
    { type: "callout", text: "La competence cle n'est pas de tout memoriser. C'est de savoir suivre le fil: navigateur -> route -> validation -> Prisma -> reponse -> affichage." }
].map((block) => {
    if (block.text) block.text = normalize(block.text)
    if (block.items) {
        block.items = block.items.map((item) => Array.isArray(item) ? item.map(normalize) : normalize(item))
    }
    return block
})

const page = { width: 595.28, height: 841.89, margin: 54 }
const contentWidth = page.width - page.margin * 2
const footerY = page.height - 30

const fonts = {
    regular: "F1",
    bold: "F2",
    mono: "F3"
}

class PdfBuilder {
    constructor() {
        this.pages = []
        this.current = null
        this.y = page.margin
        this.pageNumber = 0
    }

    newPage() {
        if (this.current) this.finishPage()
        this.pageNumber += 1
        this.current = []
        this.y = page.margin
    }

    finishPage() {
        this.current.push(`BT /${fonts.regular} 8 Tf 0.45 0.45 0.45 rg ${page.margin} ${footerY} Td (${escapePdfText(`CyberDesk - Cours complet - page ${this.pageNumber}`)}) Tj ET`)
        this.pages.push(this.current.join("\n"))
        this.current = null
    }

    ensure(space) {
        if (!this.current) this.newPage()
        if (this.y + space > page.height - page.margin - 24) this.newPage()
    }

    textLine(text, x, y, size, font, color = "0 0 0") {
        const pdfY = page.height - y
        this.current.push(`BT /${font} ${size} Tf ${color} rg ${x.toFixed(2)} ${pdfY.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`)
    }

    paragraph(text, options = {}) {
        const size = options.size ?? 11
        const leading = options.leading ?? 15
        const font = options.font ?? fonts.regular
        const indent = options.indent ?? 0
        const before = options.before ?? 0
        const after = options.after ?? 7
        const color = options.color ?? "0 0 0"
        const maxWidth = contentWidth - indent
        const lines = wrapText(text, maxWidth, size, font === fonts.mono)
        this.ensure(before + lines.length * leading + after)
        this.y += before
        for (const line of lines) {
            this.textLine(line, page.margin + indent, this.y, size, font, color)
            this.y += leading
        }
        this.y += after
    }

    heading(text, level) {
        const config = {
            1: { size: 18, leading: 23, before: 16, after: 8, color: "0.05 0.20 0.36" },
            2: { size: 14, leading: 18, before: 11, after: 5, color: "0.10 0.32 0.56" },
            3: { size: 12, leading: 16, before: 8, after: 4, color: "0.12 0.22 0.34" }
        }[level]
        this.paragraph(text, { ...config, font: fonts.bold })
    }

    code(text) {
        const lines = normalize(text).split("\n")
        const wrapped = []
        for (const line of lines) {
            const chunks = wrapText(line || " ", contentWidth - 24, 8.5, true)
            wrapped.push(...chunks)
        }
        const leading = 11
        let index = 0
        while (index < wrapped.length) {
            const capacity = Math.max(1, Math.floor((page.height - page.margin - 48 - this.y) / leading))
            if (capacity < 4) {
                this.newPage()
                continue
            }
            const take = Math.min(capacity, wrapped.length - index)
            this.ensure(take * leading + 18)
            this.y += 5
            for (let i = 0; i < take; i++) {
                this.textLine(wrapped[index + i], page.margin + 12, this.y, 8.5, fonts.mono, "0.08 0.08 0.08")
                this.y += leading
            }
            this.y += 9
            index += take
        }
    }

    bulletList(items, numbered = false) {
        items.forEach((item, index) => {
            const prefix = numbered ? `${index + 1}. ` : "- "
            this.paragraph(prefix + item, { indent: 14, after: 2, leading: 14 })
        })
        this.y += 4
    }

    callout(text) {
        this.paragraph("A retenir: " + text, {
            size: 10.5,
            leading: 14,
            font: fonts.bold,
            before: 4,
            after: 10,
            indent: 10,
            color: "0.10 0.28 0.48"
        })
    }
}

const escapePdfText = (input) => normalize(String(input))
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")

function wrapText(text, maxWidth, fontSize, mono = false) {
    const average = mono ? fontSize * 0.58 : fontSize * 0.50
    const maxChars = Math.max(20, Math.floor(maxWidth / average))
    const result = []
    for (const raw of String(text).split("\n")) {
        const words = raw.split(/(\s+)/).filter(Boolean)
        let line = ""
        for (const word of words) {
            if (word.length > maxChars) {
                if (line.trim()) result.push(line.trimEnd())
                for (let i = 0; i < word.length; i += maxChars) result.push(word.slice(i, i + maxChars))
                line = ""
                continue
            }
            if ((line + word).length > maxChars && line.trim()) {
                result.push(line.trimEnd())
                line = word.trimStart()
            } else {
                line += word
            }
        }
        result.push(line.trimEnd())
    }
    return result.length ? result : [""]
}

function buildPdf() {
    const pdf = new PdfBuilder()
    pdf.newPage()

    for (const block of doc) {
        if (block.type === "title") pdf.paragraph(block.text, { size: 28, leading: 33, font: fonts.bold, before: 10, after: 8, color: "0.02 0.16 0.32" })
        if (block.type === "subtitle") pdf.paragraph(block.text, { size: 14, leading: 19, after: 12, color: "0.22 0.25 0.30" })
        if (block.type === "meta") pdf.paragraph(block.text, { size: 9.5, leading: 13, font: fonts.mono, after: 18, color: "0.35 0.35 0.35" })
        if (block.type === "callout") pdf.callout(block.text)
        if (block.type === "h1") pdf.heading(block.text, 1)
        if (block.type === "h2") pdf.heading(block.text, 2)
        if (block.type === "h3") pdf.heading(block.text, 3)
        if (block.type === "p") pdf.paragraph(block.text)
        if (block.type === "code") pdf.code(block.text)
        if (block.type === "bullets") pdf.bulletList(block.items)
        if (block.type === "steps") pdf.bulletList(block.items, true)
        if (block.type === "terms") {
            for (const [term, definition] of block.items) {
                pdf.paragraph(`${term}: ${definition}`, { indent: 10, after: 3, leading: 14 })
            }
        }
    }
    pdf.finishPage()

    const objects = []
    const add = (content) => {
        objects.push(content)
        return objects.length
    }

    const catalogId = add("")
    const pagesId = add("")
    const fontRegularId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    const fontBoldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    const fontMonoId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")
    const pageIds = []

    for (const pageContent of pdf.pages) {
        const streamBuffer = Buffer.from(pageContent, "latin1")
        const contentId = add(`<< /Length ${streamBuffer.length} >>\nstream\n${pageContent}\nendstream`)
        const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> /Contents ${contentId} 0 R >>`)
        pageIds.push(pageId)
    }

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`

    const chunks = []
    const offsets = [0]
    const push = (text, enc = "latin1") => chunks.push(Buffer.from(text, enc))
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")
    for (let i = 0; i < objects.length; i++) {
        offsets.push(Buffer.concat(chunks).length)
        push(`${i + 1} 0 obj\n${objects[i]}\nendobj\n`)
    }
    const xrefOffset = Buffer.concat(chunks).length
    push(`xref\n0 ${objects.length + 1}\n`)
    push("0000000000 65535 f \n")
    for (let i = 1; i < offsets.length; i++) {
        push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`)
    }
    push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, Buffer.concat(chunks))
    console.log(`PDF generated: ${outputPath}`)
    console.log(`Pages: ${pdf.pages.length}`)
}

buildPdf()
