const clientModal = document.querySelector("#client-modal");
const openClientModalButtons = document.querySelectorAll("#open-client-modal, [data-open-client-modal]");
const closeClientModalButtons = document.querySelectorAll("[data-close-client-modal]");
const dialogOpenButtons = document.querySelectorAll("[data-dialog-target]");
const dialogCloseButtons = document.querySelectorAll("[data-dialog-close]");

if (clientModal) {
    openClientModalButtons.forEach((button) => {
        button.addEventListener("click", () => clientModal.showModal());
    });

    closeClientModalButtons.forEach((button) => {
        button.addEventListener("click", () => clientModal.close());
    });

    clientModal.addEventListener("click", (event) => {
        if (event.target === clientModal) {
            clientModal.close();
        }
    });

    if (clientModal.dataset.openOnLoad === "true") {
        clientModal.showModal();
    }
}

dialogOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const dialog = document.querySelector(button.dataset.dialogTarget);
        dialog?.showModal();
    });
});

dialogCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
        button.closest("dialog")?.close();
    });
});

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
