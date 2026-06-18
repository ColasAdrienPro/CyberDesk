// Elements principaux de la modale d'ajout client et des dialogs generiques.
const clientModal = document.querySelector("#client-modal");
const openClientModalButtons = document.querySelectorAll("#open-client-modal, [data-open-client-modal]");
const closeClientModalButtons = document.querySelectorAll("[data-close-client-modal]");
const dialogOpenButtons = document.querySelectorAll("[data-dialog-target]");
const dialogCloseButtons = document.querySelectorAll("[data-dialog-close]");

// Gestion de la modale principale d'ajout client.
if (clientModal) {
    openClientModalButtons.forEach((button) => {
        button.addEventListener("click", () => clientModal.showModal());
    });

    closeClientModalButtons.forEach((button) => {
        button.addEventListener("click", () => clientModal.close());
    });

    // Un clic sur le fond du dialog ferme la modale.
    clientModal.addEventListener("click", (event) => {
        if (event.target === clientModal) {
            clientModal.close();
        }
    });

    // Reouvre automatiquement la modale quand le serveur renvoie des erreurs
    if (clientModal.dataset.openOnLoad === "true") {
        clientModal.showModal();
    }
}

// Ouvre n'importe quel dialog identifie par data-dialog-target.
dialogOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const dialog = document.querySelector(button.dataset.dialogTarget);
        dialog?.showModal();
    });
});

// Ferme le dialog parent du bouton clique.
dialogCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
        button.closest("dialog")?.close();
    });
});

// Active la fermeture par clic exterieur pour les dialogs qui le demandent.
document.querySelectorAll("dialog[data-click-outside-close]").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });

    if (dialog.dataset.openOnLoad === "true") {
        dialog.showModal();
    }
});
