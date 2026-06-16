const clientModal = document.querySelector("#client-modal");
const openClientModalButtons = document.querySelectorAll("#open-client-modal, [data-open-client-modal]");
const closeClientModalButtons = document.querySelectorAll("[data-close-client-modal]");

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
