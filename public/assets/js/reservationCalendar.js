// On attend que le HTML de la page soit completement charge avant de manipuler
// les elements du calendrier et du formulaire.
document.addEventListener("DOMContentLoaded", async () => {
    // On recupere le conteneur HTML dans lequel FullCalendar va dessiner le planning.
    const calendarElement = document.getElementById("reservationCalendar")

    // On recupere le formulaire qui permet de creer une reservation ou une demande.
    const reservationForm = document.getElementById("reservationForm")

    // Si la page courante n'a pas de calendrier, ou si la librairie FullCalendar
    // n'est pas chargee, on arrete le script sans provoquer d'erreur.
    if (!calendarElement || !window.FullCalendar) {
        return
    }

    // Le role vient de l'attribut data-calendar-role pose dans le Twig.
    // Il vaut "client" sur la page client et "manager" sur la page manager.
    const role = calendarElement.dataset.calendarRole || reservationForm?.dataset.calendarRole

    // Ce booleen evite de comparer role === "client" partout dans le fichier.
    const isClient = role === "client"

    // Select des postes disponibles.
    const computerSelect = document.getElementById("reservationComputerSelect")

    // Select des clients; il existe seulement sur la page manager.
    const clientSelect = document.getElementById("reservationClientSelect")

    // Champ jour de reservation.
    const dateInput = document.getElementById("reservationDate")

    // Champ heure de debut.
    const startTimeInput = document.getElementById("reservationStartTime")

    // Select de duree: 30, 60, 90 minutes, etc.
    const durationSelect = document.getElementById("reservationDuration")

    // Zone d'affichage des erreurs ou succes du formulaire.
    const formMessage = document.getElementById("reservationFormMessage")

    // Liste des demandes en attente; elle existe seulement sur la page manager.
    const pendingReservationList = document.getElementById("pendingReservationList")

    // Convertit une date JavaScript en valeur compatible avec <input type="date">.
    const formatDateValue = (date) => {
        // getFullYear() donne l'annee locale, par exemple 2026.
        const year = date.getFullYear()

        // getMonth() commence a 0, donc janvier = 0; on ajoute 1.
        // padStart force deux chiffres: 6 devient "06".
        const month = String(date.getMonth() + 1).padStart(2, "0")

        // Meme principe pour le jour du mois.
        const day = String(date.getDate()).padStart(2, "0")

        // L'input date attend exactement le format YYYY-MM-DD.
        return `${year}-${month}-${day}`
    }

    // Affiche un message sous le formulaire, en rouge pour les erreurs ou en
    // vert pour les succes.
    const setMessage = (message, type = "error") => {
        // Si la page ne contient pas de zone de message, on utilise alert()
        // comme secours pour ne pas perdre l'information.
        if (!formMessage) {
            if (message) {
                alert(message)
            }
            return
        }

        // On remplace le contenu texte par le message recu.
        formMessage.textContent = message

        // Si message est vide, on cache la zone; sinon on l'affiche.
        formMessage.classList.toggle("hidden", !message)

        // Classes Tailwind pour l'etat erreur.
        formMessage.classList.toggle("border-[#ffb3ad]", type === "error")
        formMessage.classList.toggle("bg-[#ffdad7]", type === "error")
        formMessage.classList.toggle("text-[#930013]", type === "error")

        // Classes Tailwind pour l'etat succes.
        formMessage.classList.toggle("border-[#6cf8bb]", type === "success")
        formMessage.classList.toggle("bg-[#ecfdf5]", type === "success")
        formMessage.classList.toggle("text-[#047857]", type === "success")
    }

    // Fonction commune pour appeler les routes API JSON.
    const requestJson = async (url, options = {}) => {
        // fetch envoie une requete HTTP vers le serveur Express.
        const response = await fetch(url, {
            // On annonce au serveur que le corps de requete est du JSON.
            headers: {
                "Content-Type": "application/json",

                // On garde la possibilite d'ajouter d'autres headers si besoin.
                ...(options.headers || {})
            },

            // On applique les options recues: method, body, etc.
            ...options
        })

        // On essaye de lire la reponse JSON.
        // Si la reponse est vide ou non JSON, on retourne un objet vide.
        const data = await response.json().catch(() => ({}))

        // response.ok vaut false pour les codes 400, 404, 409, 500, etc.
        if (!response.ok) {
            // On transforme l'erreur HTTP en erreur JavaScript lisible par catch.
            throw new Error(data.message || "Une erreur est survenue.")
        }

        // Si tout va bien, on renvoie les donnees parsees.
        return data
    }

    // Formate les dates affichees dans la liste manager des demandes en attente.
    const formatReservationDate = (value) => {
        // Intl.DateTimeFormat gere le format francais proprement.
        return new Intl.DateTimeFormat("fr-FR", {
            // Exemple: "jeu."
            weekday: "short",

            // Jour numerique sur deux chiffres.
            day: "2-digit",

            // Mois numerique sur deux chiffres.
            month: "2-digit",

            // Heure sur deux chiffres.
            hour: "2-digit",

            // Minutes sur deux chiffres.
            minute: "2-digit"
        // value arrive souvent sous forme de chaine ISO; new Date le reconvertit.
        }).format(new Date(value))
    }

    // Remplit un select HTML avec une liste d'objets venant de l'API.
    const fillSelect = (select, items, getLabel, emptyLabel) => {
        // Si le select n'existe pas sur cette page, il n'y a rien a faire.
        if (!select) {
            return
        }

        // On supprime les anciennes options avant de reconstruire la liste.
        select.innerHTML = ""

        // Si l'API renvoie une liste vide, on affiche une seule option informative.
        if (items.length === 0) {
            // Creation d'une balise <option>.
            const option = document.createElement("option")

            // Valeur vide pour eviter une soumission valide.
            option.value = ""

            // Texte affiche a l'utilisateur.
            option.textContent = emptyLabel

            // On ajoute l'option au select.
            select.appendChild(option)

            // On desactive le select car aucun choix reel n'est possible.
            select.disabled = true
            return
        }

        // Si on a des donnees, le select doit etre utilisable.
        select.disabled = false

        // On cree une option pour chaque element recu.
        items.forEach((item) => {
            // Creation de l'option.
            const option = document.createElement("option")

            // La valeur envoyee au serveur sera l'id de l'objet.
            option.value = item.id

            // getLabel personnalise le texte selon le type d'objet.
            option.textContent = getLabel(item)

            // On insere l'option dans le select.
            select.appendChild(option)
        })
    }

    // Charge les donnees necessaires au formulaire.
    const loadFormData = async () => {
        // Le client et le manager n'ont pas le meme endpoint pour les postes.
        const computerUrl = isClient ? "/api/client/computers" : "/api/manager/computers"

        try {
            // On demande au serveur les postes disponibles.
            const computers = await requestJson(computerUrl)

            // On remplit le select des postes avec les noms de postes.
            fillSelect(computerSelect, computers, (computer) => computer.name, "Aucun poste disponible")

            // Sur la page manager, il faut aussi choisir le client concerne.
            if (!isClient && clientSelect) {
                // On recupere les clients du manager connecte.
                const clients = await requestJson("/api/manager/clients")

                // On remplit le select avec prenom + nom.
                fillSelect(clientSelect, clients, (client) => `${client.firstname} ${client.lastname}`, "Aucun client disponible")
            }
        } catch (error) {
            // Toute erreur API est affichee dans le formulaire.
            setMessage(error.message)
        }
    }

    // Charge les demandes client en attente de validation par le manager.
    const loadPendingReservations = async () => {
        // Les clients n'ont pas cette liste; on sort immediatement.
        if (isClient || !pendingReservationList) {
            return
        }

        try {
            // On recupere les demandes PENDING du manager connecte.
            const reservations = await requestJson("/api/manager/reservations/pending")

            // On efface l'etat "Chargement..." ou l'ancien contenu.
            pendingReservationList.innerHTML = ""

            // S'il n'y a aucune demande, on affiche un message simple.
            if (reservations.length === 0) {
                pendingReservationList.innerHTML = '<div class="rounded-lg border border-[#c2c6d6] bg-[#f8f9ff] p-4 text-sm text-[#424754]">Aucune demande en attente.</div>'
                return
            }

            // Pour chaque demande, on construit une carte HTML.
            reservations.forEach((reservation) => {
                // Le DOM natif evite d'injecter directement des valeurs utilisateur
                // dans du HTML, ce qui limite les risques XSS.
                const item = document.createElement("div")

                // Style de la carte de demande en attente.
                item.className = "rounded-lg border border-[#f7c66f] bg-[#fff8e6] p-4"

                // Ligne interne: informations a gauche, bouton a droite.
                const row = document.createElement("div")
                row.className = "flex items-start justify-between gap-3"

                // Conteneur des textes.
                const content = document.createElement("div")
                content.className = "min-w-0"

                // Nom du client demandeur.
                const clientName = document.createElement("p")
                clientName.className = "truncate text-sm font-semibold text-[#0b1c30]"
                clientName.textContent = reservation.clientName

                // Nom du poste demande.
                const computerName = document.createElement("p")
                computerName.className = "mt-1 font-['JetBrains_Mono'] text-xs font-medium text-[#b45309]"
                computerName.textContent = reservation.computerName

                // Texte contenant debut et fin du creneau.
                const time = document.createElement("p")
                time.className = "mt-2 text-sm leading-5 text-[#424754]"
                time.textContent = `${formatReservationDate(reservation.start)} - ${formatReservationDate(reservation.end)}`

                // Bouton qui servira a valider la demande.
                const button = document.createElement("button")
                button.type = "button"

                // On stocke l'id de reservation dans data-approve-reservation.
                // Le listener de clic s'en servira plus bas.
                button.dataset.approveReservation = reservation.id
                button.className = "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#00714d] px-3 py-2 font-['JetBrains_Mono'] text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#008f63]"

                // Ici le HTML est fixe et ne contient pas de donnee utilisateur.
                button.innerHTML = '<span class="material-symbols-outlined text-[18px]">task_alt</span>Valider'

                // On place les textes dans leur conteneur.
                content.append(clientName, computerName, time)

                // On place les textes et le bouton dans la ligne.
                row.append(content, button)

                // On place la ligne dans la carte.
                item.appendChild(row)

                // On ajoute la carte dans la liste visible.
                pendingReservationList.appendChild(item)
            })
        } catch (error) {
            // Si le chargement echoue, on remplace la liste par un message d'erreur.
            pendingReservationList.innerHTML = `<div class="rounded-lg border border-[#ffb3ad] bg-[#ffdad7] p-4 text-sm text-[#930013]">${error.message}</div>`
        }
    }

    // Calcule les dates de debut et de fin a partir du formulaire.
    const getReservationDates = () => {
        // Jour choisi, par exemple "2026-06-18".
        const date = dateInput?.value

        // Heure choisie, par exemple "09:00".
        const startTime = startTimeInput?.value

        // Duree en minutes, transformee en nombre.
        const duration = parseInt(durationSelect?.value)

        // On bloque si un des champs est absent ou invalide.
        if (!date || !startTime || Number.isNaN(duration)) {
            throw new Error("Merci de choisir un jour, une heure et une duree.")
        }

        // On assemble le jour et l'heure pour obtenir la date de debut locale.
        const start = new Date(`${date}T${startTime}`)

        // On ajoute duration minutes pour obtenir la date de fin.
        const end = new Date(start.getTime() + duration * 60 * 1000)

        // On verifie que les dates existent et que la fin est apres le debut.
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
            throw new Error("Creneau invalide.")
        }

        // Le formulaire renvoie les deux objets Date.
        return { start, end }
    }

    // Reglage du champ date au chargement.
    if (dateInput) {
        // Date du jour au format attendu par l'input.
        const today = formatDateValue(new Date())

        // L'utilisateur ne peut pas choisir une date avant aujourd'hui.
        dateInput.min = today

        // Si aucune valeur n'est deja presente, on met aujourd'hui.
        dateInput.value ||= today
    }

    // Reglage du champ heure au chargement.
    if (startTimeInput) {
        // Si aucune heure n'est deja presente, on commence a 09:00.
        startTimeInput.value ||= "09:00"
    }

    // On charge les postes et clients avant d'afficher le calendrier final.
    await loadFormData()

    // Sur manager, on charge aussi la liste des demandes en attente.
    await loadPendingReservations()

    // Creation de l'instance FullCalendar.
    const calendar = new FullCalendar.Calendar(calendarElement, {
        // Interface en francais.
        locale: "fr",

        // Vue par defaut: semaine avec colonnes horaires.
        initialView: "timeGridWeek",

        // Affiche une ligne indiquant l'heure actuelle.
        nowIndicator: true,

        // On ne cree pas de reservation en selectionnant directement sur le calendrier.
        selectable: false,

        // On masque la ligne "jour entier", car les reservations sont horaires.
        allDaySlot: false,

        // La semaine commence lundi.
        firstDay: 1,

        // Heure minimale visible.
        slotMinTime: "08:00:00",

        // Heure maximale visible.
        slotMaxTime: "22:00:00",

        // Granularite visuelle des creneaux.
        slotDuration: "00:30:00",

        // La hauteur s'adapte au contenu.
        height: "auto",

        // Boutons affiches dans l'entete du calendrier.
        headerToolbar: {
            // Navigation a gauche.
            left: "prev,next today",

            // Titre au centre.
            center: "title",

            // Choix des vues a droite.
            right: "timeGridDay,timeGridWeek,dayGridMonth"
        },

        // Traduction des libelles de boutons.
        buttonText: {
            today: "Aujourd'hui",
            month: "Mois",
            week: "Semaine",
            day: "Jour"
        },

        // URL appelee automatiquement par FullCalendar pour charger les evenements.
        events: isClient ? "/api/client/reservations" : "/api/manager/reservations",

        // Fonction declenchee quand l'utilisateur clique sur un evenement.
        eventClick: async (clickInfo) => {
            // Evenement FullCalendar clique.
            const event = clickInfo.event

            // Indique si la reservation appartient au client connecte.
            const isOwnReservation = event.extendedProps.isOwnReservation

            // Un client peut voir les reservations approuvees des autres pour
            // comprendre les indisponibilites, mais il ne peut pas les supprimer.
            if (isClient && !isOwnReservation) {
                setMessage("Ce creneau est deja reserve par un autre client.")
                return
            }

            // Message different selon le role.
            const confirmMessage = isClient
                ? "Annuler cette demande ou reservation ?"
                : `Supprimer la reservation de ${event.extendedProps.clientName} ?`

            // Si l'utilisateur annule la confirmation, on ne fait rien.
            if (!confirm(confirmMessage)) {
                return
            }

            try {
                // On demande au serveur de supprimer la reservation.
                await requestJson(`/api/${isClient ? "client" : "manager"}/reservations/${event.id}`, {
                    method: "DELETE"
                })

                // On retire l'evenement de l'affichage sans recharger toute la page.
                event.remove()

                // Sur manager, la suppression peut changer la liste des demandes.
                await loadPendingReservations()

                // Message de confirmation.
                setMessage("Reservation supprimee.", "success")
            } catch (error) {
                // Affichage de l'erreur serveur.
                setMessage(error.message)
            }
        }
    })

    // Affiche effectivement le calendrier dans le DOM.
    calendar.render()

    // Gestion de la soumission du formulaire de reservation.
    reservationForm?.addEventListener("submit", async (event) => {
        // On empeche le formulaire HTML de recharger la page.
        event.preventDefault()

        // On efface l'ancien message avant de traiter la nouvelle demande.
        setMessage("")

        try {
            // Calcule les dates de debut et de fin.
            const { start, end } = getReservationDates()

            // Corps JSON commun aux deux roles.
            const body = {
                // Poste choisi.
                computerId: computerSelect?.value,

                // toISOString() envoie une date standardisee au serveur.
                start: start.toISOString(),

                // Date de fin standardisee.
                end: end.toISOString()
            }

            // Le poste est obligatoire.
            if (!body.computerId) {
                throw new Error("Merci de choisir un poste.")
            }

            // Le manager doit aussi choisir le client beneficiaire.
            if (!isClient) {
                body.clientId = clientSelect?.value

                // Le client est obligatoire cote manager.
                if (!body.clientId) {
                    throw new Error("Merci de choisir un client.")
                }
            }

            // On cree la reservation cote serveur.
            const createdEvent = await requestJson(`/api/${isClient ? "client" : "manager"}/reservations`, {
                method: "POST",
                body: JSON.stringify(body)
            })

            // On ajoute immediatement l'evenement renvoye par le serveur au calendrier.
            calendar.addEvent(createdEvent)

            // On deplace le calendrier sur la date reservee.
            calendar.gotoDate(start)

            // Sur manager, on rafraichit la liste des demandes.
            await loadPendingReservations()

            // Message adapte au role.
            setMessage(isClient ? "Demande envoyee. Elle attend la validation du gerant." : "Reservation ajoutee.", "success")
        } catch (error) {
            // Toute erreur de validation ou API finit ici.
            setMessage(error.message)
        }
    })

    // Gestion des clics sur les boutons "Valider" des demandes en attente.
    pendingReservationList?.addEventListener("click", async (event) => {
        // closest remonte dans le DOM pour trouver le bouton, meme si on clique
        // sur l'icone ou le texte a l'interieur.
        const approveButton = event.target.closest("[data-approve-reservation]")

        // Si le clic ne concerne pas un bouton de validation, on ignore.
        if (!approveButton) {
            return
        }

        try {
            // On desactive le bouton pour eviter un double clic.
            approveButton.disabled = true

            // On demande au serveur de passer la demande en APPROVED.
            await requestJson(`/api/manager/reservations/${approveButton.dataset.approveReservation}/approve`, {
                method: "PATCH"
            })

            // On force FullCalendar a recharger les evenements depuis l'API.
            calendar.refetchEvents()

            // On recharge la liste des demandes, car celle-ci vient d'etre traitee.
            await loadPendingReservations()

            // Message de confirmation.
            setMessage("Demande validee.", "success")
        } catch (error) {
            // En cas d'erreur, on reactive le bouton pour permettre une nouvelle tentative.
            approveButton.disabled = false

            // On affiche l'erreur renvoyee par le serveur.
            setMessage(error.message)
        }
    })
})
