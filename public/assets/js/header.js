// Recupere les elements du menu mobile rendus par le partial header.twig.
const mobileMenuButton = document.querySelector("#mobile-menu-button");
const mobileMenu = document.querySelector("#mobile-menu");
const menuIcon = document.querySelector("[data-menu-icon]");

// Bascule l'affichage du menu mobile et maintient aria-expanded a jour pour
// l'accessibilite.
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
