// Elements de la modale poste, des dialogs d'edition/suppression et des
// champs d'adresse MAC.
const computerModal = document.querySelector("#computer-modal");
const openComputerModalButtons = document.querySelectorAll("#open-computer-modal, [data-open-computer-modal]");
const closeComputerModalButtons = document.querySelectorAll("[data-close-computer-modal]");
const macAddressInput = document.querySelector("#macAddress");
const dialogOpenButtons = document.querySelectorAll("[data-dialog-target]");
const dialogCloseButtons = document.querySelectorAll("[data-dialog-close]");
const macAddressInputs = document.querySelectorAll("[data-mac-address-input]");

// Gestion de la modale principale d'ajout d'ordinateur.
if (computerModal) {
    openComputerModalButtons.forEach((button) => {
        button.addEventListener("click", () => computerModal.showModal());
    });

    closeComputerModalButtons.forEach((button) => {
        button.addEventListener("click", () => computerModal.close());
    });

    // Un clic sur le fond du dialog ferme la modale.
    computerModal.addEventListener("click", (event) => {
        if (event.target === computerModal) {
            computerModal.close();
        }
    });

    // Reouvre automatiquement la modale apres une erreur serveur.
    if (computerModal.dataset.openOnLoad === "true") {
        computerModal.showModal();
    }
}

// Formate l'adresse MAC pendant la saisie dans le formulaire principal.
if (macAddressInput) {
    macAddressInput.addEventListener("input", (event) => {
        const value = event.target.value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
        const formatted = value.match(/.{1,2}/g)?.join(":") ?? "";

        event.target.value = formatted.substring(0, 17);
    });
}

// Ouvre les dialogs generiques dont le selecteur est porte par le bouton.
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

// Active fermeture au clic exterieur et ouverture automatique post-erreur.
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

// Applique aussi le formatage MAC aux champs presents dans les dialogs
// d'edition, pas seulement au formulaire de creation.
macAddressInputs.forEach((input) => {
    input.addEventListener("input", (event) => {
        const value = event.target.value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
        const formatted = value.match(/.{1,2}/g)?.join(":") ?? "";

        event.target.value = formatted.substring(0, 17);
    });
});
