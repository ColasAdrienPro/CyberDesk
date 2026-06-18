const computerModal = document.querySelector("#computer-modal");
const openComputerModalButtons = document.querySelectorAll("#open-computer-modal, [data-open-computer-modal]");
const closeComputerModalButtons = document.querySelectorAll("[data-close-computer-modal]");
const macAddressInput = document.querySelector("#macAddress");
const dialogOpenButtons = document.querySelectorAll("[data-dialog-target]");
const dialogCloseButtons = document.querySelectorAll("[data-dialog-close]");
const macAddressInputs = document.querySelectorAll("[data-mac-address-input]");

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

macAddressInputs.forEach((input) => {
    input.addEventListener("input", (event) => {
        const value = event.target.value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
        const formatted = value.match(/.{1,2}/g)?.join(":") ?? "";

        event.target.value = formatted.substring(0, 17);
    });
});
