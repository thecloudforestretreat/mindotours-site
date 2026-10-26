async function loadIncludes() {
  const header = document.getElementById("siteHeader");
  const footer = document.getElementById("siteFooter");

  async function mountInclude(target, path, isHeader = false) {
    if (!target) return;
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) throw new Error(`Include returned ${res.status}`);
      target.innerHTML = await res.text();
      configureLocalizedIncludes();
      if (isHeader) initMenu();
    } catch (error) {
      console.error(`Unable to load ${path}`, error);
    }
  }

  await Promise.all([
    mountInclude(header, "/assets/includes/header.html", true),
    mountInclude(footer, "/assets/includes/footer.html")
  ]);
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
      about: "/about/",
      contact: "/contact/",
      book: "/book-tour/"
    },
    es: {
      home: "/es/",
      tours: "/es/tours/",
      activities: "/es/actividades/",
      about: "/es/sobre-nosotros/",
      contact: "/es/contacto/",
      book: "/es/reservar-tour/"
    }
  };

  const brand = document.querySelector(".brand");
  if (brand) {
    brand.href = localizedHrefs[lang].home;
    brand.setAttribute("aria-label", lang === "es" ? "Mindo Tours — Inicio" : "Mindo Tours home");
  }

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

  const spanish = document.documentElement.lang.toLowerCase().startsWith("es");
  toggle.setAttribute("aria-label", spanish ? "Abrir menú" : "Open menu");

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    toggle.setAttribute("aria-label", spanish
      ? (expanded ? "Abrir menú" : "Cerrar menú")
      : (expanded ? "Open menu" : "Close menu"));
    mobileMenu.hidden = expanded;
    mobileMenu.classList.toggle("is-open", !expanded);
    document.body.classList.toggle("menuOpen", !expanded);
  });
}

document.addEventListener("DOMContentLoaded", loadIncludes);
