// Initialise le calendrier une fois le DOM pret, car la page charge FullCalendar
// et les elements de formulaire depuis les templates Twig.
document.addEventListener("DOMContentLoaded", async () => {
    const calendarElement = document.getElementById("reservationCalendar")
    const reservationForm = document.getElementById("reservationForm")

    if (!calendarElement || !window.FullCalendar) {
        return
    }

    // Le meme script pilote la page client et la page manager. Le role decide
    // quelles API appeler et quels champs afficher.
    const role = calendarElement.dataset.calendarRole || reservationForm?.dataset.calendarRole
    const isClient = role === "client"
    const computerSelect = document.getElementById("reservationComputerSelect")
    const clientSelect = document.getElementById("reservationClientSelect")
    const dateInput = document.getElementById("reservationDate")
    const startTimeInput = document.getElementById("reservationStartTime")
    const durationSelect = document.getElementById("reservationDuration")
    const formMessage = document.getElementById("reservationFormMessage")
    const pendingReservationList = document.getElementById("pendingReservationList")

    // Formate une date JS au format attendu par un input type="date".
    const formatDateValue = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")

        return `${year}-${month}-${day}`
    }

    // Affiche les messages du formulaire. Si la zone n'existe pas, on garde
    // un fallback alert pour ne pas perdre l'information.
    const setMessage = (message, type = "error") => {
        if (!formMessage) {
            if (message) {
                alert(message)
            }
            return
        }

        formMessage.textContent = message
        formMessage.classList.toggle("hidden", !message)
        formMessage.classList.toggle("border-[#ffb3ad]", type === "error")
        formMessage.classList.toggle("bg-[#ffdad7]", type === "error")
        formMessage.classList.toggle("text-[#930013]", type === "error")
        formMessage.classList.toggle("border-[#6cf8bb]", type === "success")
        formMessage.classList.toggle("bg-[#ecfdf5]", type === "success")
        formMessage.classList.toggle("text-[#047857]", type === "success")
    }

    // Wrapper fetch JSON: ajoute le Content-Type, parse la reponse et convertit
    // les erreurs HTTP en exceptions lisibles par l'UI.
    const requestJson = async (url, options = {}) => {
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            throw new Error(data.message || "Une erreur est survenue.")
        }

        return data
    }

    // Format court pour les dates affichees dans la liste des demandes manager.
    const formatReservationDate = (value) => {
        return new Intl.DateTimeFormat("fr-FR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(value))
    }

    // Remplit un select a partir d'une liste API. Si la liste est vide, le
    // select est desactive avec un libelle explicite.
    const fillSelect = (select, items, getLabel, emptyLabel) => {
        if (!select) {
            return
        }

        select.innerHTML = ""

        if (items.length === 0) {
            const option = document.createElement("option")
            option.value = ""
            option.textContent = emptyLabel
            select.appendChild(option)
            select.disabled = true
            return
        }

        select.disabled = false
        items.forEach((item) => {
            const option = document.createElement("option")
            option.value = item.id
            option.textContent = getLabel(item)
            select.appendChild(option)
        })
    }

    // Charge les postes disponibles et, cote manager, les clients selectionnables.
    const loadFormData = async () => {
        const computerUrl = isClient ? "/api/client/computers" : "/api/manager/computers"

        try {
            const computers = await requestJson(computerUrl)
            fillSelect(computerSelect, computers, (computer) => computer.name, "Aucun poste disponible")

            if (!isClient && clientSelect) {
                const clients = await requestJson("/api/manager/clients")
                fillSelect(clientSelect, clients, (client) => `${client.firstname} ${client.lastname}`, "Aucun client disponible")
            }
        } catch (error) {
            setMessage(error.message)
        }
    }

    // Charge la file d'attente des demandes client. Cette zone n'existe que sur
    // la page manager.
    const loadPendingReservations = async () => {
        if (isClient || !pendingReservationList) {
            return
        }

        try {
            const reservations = await requestJson("/api/manager/reservations/pending")
            pendingReservationList.innerHTML = ""

            if (reservations.length === 0) {
                pendingReservationList.innerHTML = '<div class="rounded-lg border border-[#c2c6d6] bg-[#f8f9ff] p-4 text-sm text-[#424754]">Aucune demande en attente.</div>'
                return
            }

            reservations.forEach((reservation) => {
                // Chaque demande est construite en DOM natif pour eviter
                // d'injecter des valeurs utilisateur via innerHTML.
                const item = document.createElement("div")
                item.className = "rounded-lg border border-[#f7c66f] bg-[#fff8e6] p-4"

                const row = document.createElement("div")
                row.className = "flex items-start justify-between gap-3"

                const content = document.createElement("div")
                content.className = "min-w-0"

                const clientName = document.createElement("p")
                clientName.className = "truncate text-sm font-semibold text-[#0b1c30]"
                clientName.textContent = reservation.clientName

                const computerName = document.createElement("p")
                computerName.className = "mt-1 font-['JetBrains_Mono'] text-xs font-medium text-[#b45309]"
                computerName.textContent = reservation.computerName

                const time = document.createElement("p")
                time.className = "mt-2 text-sm leading-5 text-[#424754]"
                time.textContent = `${formatReservationDate(reservation.start)} - ${formatReservationDate(reservation.end)}`

                const button = document.createElement("button")
                button.type = "button"
                button.dataset.approveReservation = reservation.id
                button.className = "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#00714d] px-3 py-2 font-['JetBrains_Mono'] text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#008f63]"
                button.innerHTML = '<span class="material-symbols-outlined text-[18px]">task_alt</span>Valider'

                content.append(clientName, computerName, time)
                row.append(content, button)
                item.appendChild(row)
                pendingReservationList.appendChild(item)
            })
        } catch (error) {
            pendingReservationList.innerHTML = `<div class="rounded-lg border border-[#ffb3ad] bg-[#ffdad7] p-4 text-sm text-[#930013]">${error.message}</div>`
        }
    }

    // Convertit les champs date + heure + duree en deux dates ISO envoyees au
    // serveur.
    const getReservationDates = () => {
        const date = dateInput?.value
        const startTime = startTimeInput?.value
        const duration = parseInt(durationSelect?.value)

        if (!date || !startTime || Number.isNaN(duration)) {
            throw new Error("Merci de choisir un jour, une heure et une duree.")
        }

        const start = new Date(`${date}T${startTime}`)
        const end = new Date(start.getTime() + duration * 60 * 1000)

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
            throw new Error("Creneau invalide.")
        }

        return { start, end }
    }

    // Valeurs par defaut ergonomiques pour empecher une date passee au niveau
    // navigateur et preselectionner l'heure d'ouverture.
    if (dateInput) {
        const today = formatDateValue(new Date())
        dateInput.min = today
        dateInput.value ||= today
    }

    if (startTimeInput) {
        startTimeInput.value ||= "09:00"
    }

    await loadFormData()
    await loadPendingReservations()

    // Configuration FullCalendar commune aux deux roles. Les endpoints events
    // changent selon client/manager.
    const calendar = new FullCalendar.Calendar(calendarElement, {
        locale: "fr",
        initialView: "timeGridWeek",
        nowIndicator: true,
        selectable: false,
        allDaySlot: false,
        firstDay: 1,
        slotMinTime: "08:00:00",
        slotMaxTime: "22:00:00",
        slotDuration: "00:30:00",
        height: "auto",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth"
        },
        buttonText: {
            today: "Aujourd'hui",
            month: "Mois",
            week: "Semaine",
            day: "Jour"
        },
        events: isClient ? "/api/client/reservations" : "/api/manager/reservations",
        eventClick: async (clickInfo) => {
            const event = clickInfo.event
            const isOwnReservation = event.extendedProps.isOwnReservation

            if (isClient && !isOwnReservation) {
                // Un client voit les reservations validees des autres pour
                // comprendre l'indisponibilite, mais ne peut pas les modifier.
                setMessage("Ce creneau est deja reserve par un autre client.")
                return
            }

            const confirmMessage = isClient
                ? "Annuler cette demande ou reservation ?"
                : `Supprimer la reservation de ${event.extendedProps.clientName} ?`

            if (!confirm(confirmMessage)) {
                return
            }

            try {
                await requestJson(`/api/${isClient ? "client" : "manager"}/reservations/${event.id}`, {
                    method: "DELETE"
                })
                event.remove()
                await loadPendingReservations()
                setMessage("Reservation supprimee.", "success")
            } catch (error) {
                setMessage(error.message)
            }
        }
    })

    calendar.render()

    // Soumission du formulaire: cree une demande client ou une reservation
    // manager directement approuvee selon le role de la page.
    reservationForm?.addEventListener("submit", async (event) => {
        event.preventDefault()
        setMessage("")

        try {
            const { start, end } = getReservationDates()
            const body = {
                computerId: computerSelect?.value,
                start: start.toISOString(),
                end: end.toISOString()
            }

            if (!body.computerId) {
                throw new Error("Merci de choisir un poste.")
            }

            if (!isClient) {
                // Seul le manager choisit le client beneficiaire.
                body.clientId = clientSelect?.value

                if (!body.clientId) {
                    throw new Error("Merci de choisir un client.")
                }
            }

            const createdEvent = await requestJson(`/api/${isClient ? "client" : "manager"}/reservations`, {
                method: "POST",
                body: JSON.stringify(body)
            })

            calendar.addEvent(createdEvent)
            calendar.gotoDate(start)
            await loadPendingReservations()
            setMessage(isClient ? "Demande envoyee. Elle attend la validation du gerant." : "Reservation ajoutee.", "success")
        } catch (error) {
            setMessage(error.message)
        }
    })

    // Delegation de clic pour les boutons "Valider" generes dynamiquement dans
    // la liste des demandes en attente.
    pendingReservationList?.addEventListener("click", async (event) => {
        const approveButton = event.target.closest("[data-approve-reservation]")

        if (!approveButton) {
            return
        }

        try {
            approveButton.disabled = true
            await requestJson(`/api/manager/reservations/${approveButton.dataset.approveReservation}/approve`, {
                method: "PATCH"
            })
            calendar.refetchEvents()
            await loadPendingReservations()
            setMessage("Demande validee.", "success")
        } catch (error) {
            approveButton.disabled = false
            setMessage(error.message)
        }
    })
})
