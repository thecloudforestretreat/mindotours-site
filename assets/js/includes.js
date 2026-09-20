async function loadIncludes() {
  const header = document.getElementById("siteHeader");
  const footer = document.getElementById("siteFooter");

  if (header) {
    const res = await fetch("/assets/includes/header.html", { cache: "no-store" });
    header.innerHTML = await res.text();
  }

  if (footer) {
    const res = await fetch("/assets/includes/footer.html", { cache: "no-store" });
    footer.innerHTML = await res.text();
  }

  configureLocalizedIncludes();
  initMenu();
}

function configureLocalizedIncludes() {
  const lang = (document.documentElement.getAttribute("lang") || "en").toLowerCase().startsWith("es") ? "es" : "en";
  const labels = {
    en: {
      home: "Home",
      tours: "Tours",
      activities: "Activities",
      about: "About",
      contact: "Contact",
      book: "Book A Tour",
      mbw: "Mindo Bird Watching",
      copy: "Discover waterfalls, cloud forest trails, chocolate tours, and nature experiences in Mindo, Ecuador."
    },
    es: {
      home: "Inicio",
      tours: "Tours",
      activities: "Actividades",
      about: "Nosotros",
      contact: "Contacto",
      book: "Reservar Tour",
      mbw: "Mindo Bird Watching",
      copy: "Descubre cascadas, senderos del bosque nublado, tours de chocolate y experiencias de naturaleza en Mindo, Ecuador."
    }
  };
  const localizedHrefs = {
    en: {
      home: "/",
      tours: "/tours/",
      activities: "/activities/",
      contact: "/contact/",
      book: "/book-tour/"
    },
    es: {
      home: "/es/",
      tours: "/es/tours/",
      activities: "/es/actividades/",
      contact: "/es/contacto/",
      book: "/es/reservar-tour/"
    }
  };

  document.querySelectorAll("[data-nav-key]").forEach((link) => {
    const key = link.getAttribute("data-nav-key");
    if (labels[lang][key]) link.textContent = labels[lang][key];
    if (localizedHrefs[lang][key]) link.href = localizedHrefs[lang][key];
  });

  document.querySelectorAll("[data-footer-key]").forEach((element) => {
    const key = element.getAttribute("data-footer-key");
    if (labels[lang][key]) element.textContent = labels[lang][key];
  });

  document.querySelectorAll("[data-footer-legal]").forEach((element) => {
    element.textContent = "© " + new Date().getFullYear() + " mindotours.com. " +
      (lang === "es" ? "Todos los derechos reservados." : "All rights reserved.");
  });

  const enAlternate = document.querySelector('link[rel="alternate"][hreflang="en"]');
  const esAlternate = document.querySelector('link[rel="alternate"][hreflang="es"]');

  function environmentAwareAlternate(alternate) {
    if (!alternate) return "";
    const target = new URL(alternate.href);
    const hostname = window.location.hostname.toLowerCase();
    const isNonProductionHost =
      hostname === "staging.mindotours.com" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".pages.dev");
    if (isNonProductionHost && target.hostname === "mindotours.com") {
      return window.location.origin + target.pathname + target.search + target.hash;
    }
    return target.href;
  }

  document.querySelectorAll('a[lang="en"]').forEach((link) => {
    if (enAlternate) link.href = environmentAwareAlternate(enAlternate);
    link.classList.toggle("is-active", lang === "en");
    if (lang === "en") link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  document.querySelectorAll('a[lang="es"]').forEach((link) => {
    if (esAlternate) link.href = environmentAwareAlternate(esAlternate);
    link.classList.toggle("is-active", lang === "es");
    if (lang === "es") link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function initMenu() {
  const toggle = document.querySelector(".menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  if (!toggle || !mobileMenu) return;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    mobileMenu.hidden = expanded;
    mobileMenu.classList.toggle("is-open", !expanded);
    document.body.classList.toggle("menuOpen", !expanded);
  });
}

document.addEventListener("DOMContentLoaded", loadIncludes);
