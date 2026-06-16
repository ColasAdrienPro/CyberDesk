const computerModal = document.querySelector("#computer-modal");
const openComputerModalButtons = document.querySelectorAll("#open-computer-modal, [data-open-computer-modal]");
const closeComputerModalButtons = document.querySelectorAll("[data-close-computer-modal]");
const macAddressInput = document.querySelector("#macAddress");

if (computerModal) {
    openComputerModalButtons.forEach((button) => {
        button.addEventListener("click", () => computerModal.showModal());
    });

    closeComputerModalButtons.forEach((button) => {
        button.addEventListener("click", () => computerModal.close());
    });

    computerModal.addEventListener("click", (event) => {
        if (event.target === computerModal) {
            computerModal.close();
        }
    });

    if (computerModal.dataset.openOnLoad === "true") {
        computerModal.showModal();
    }
}

if (macAddressInput) {
    macAddressInput.addEventListener("input", (event) => {
        const value = event.target.value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
        const formatted = value.match(/.{1,2}/g)?.join(":") ?? "";

        event.target.value = formatted.substring(0, 17);
    });
}
