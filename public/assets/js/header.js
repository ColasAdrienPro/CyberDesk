const mobileMenuButton = document.querySelector("#mobile-menu-button");
const mobileMenu = document.querySelector("#mobile-menu");
const menuIcon = document.querySelector("[data-menu-icon]");

if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener("click", () => {
        const isOpen = !mobileMenu.hidden;

        mobileMenu.hidden = isOpen;
        mobileMenuButton.setAttribute("aria-expanded", String(!isOpen));

        if (menuIcon) {
            menuIcon.textContent = isOpen ? "menu" : "close";
        }
    });
}
