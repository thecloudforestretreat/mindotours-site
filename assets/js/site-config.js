/* Mindo Tours centralized public site configuration. */
(function () {
  "use strict";

  if (window.MT_SITE_CONFIG) return;

  var whatsappNumberDigits = "13054585402";

  window.MT_SITE_CONFIG = {
    brand: "Mindo Tours",
    sourceSite: "mindotours",
    sourceDomain: "mindotours.com",
    leadDestination: "Mindo Bird Watching",
    analytics: {
      ga4MeasurementId: "G-1ZYLW22XWP"
    },
    turnstile: {
      siteKey: "0x4AAAAAACvEWBLDiF38SNlX"
    },
    contact: {
      whatsappNumberDigits: whatsappNumberDigits,
      whatsappDisplayNumber: "+" + whatsappNumberDigits,
      email: "mindobirdwatching@gmail.com"
    },
    whatsappMessages: {
      default_en: "Hi Mindo Tours, I am planning a visit to Mindo and would like help choosing activities. Can you check options and availability?\n\nPage: {url}",
      default_es: "Hola Mindo Tours, estoy planificando una visita a Mindo y quisiera ayuda para elegir actividades. ¿Pueden revisar opciones y disponibilidad?\n\nPágina: {url}",
      book_tour_en: "Hi Mindo Tours, I would like to request a tour in Mindo. Can you help with availability and next steps?\n\nPage: {url}",
      book_tour_es: "Hola Mindo Tours, quisiera solicitar un tour en Mindo. ¿Pueden ayudarme con disponibilidad y los próximos pasos?\n\nPágina: {url}",
      day_trips_en: "Hi Mindo Tours, I am interested in a Mindo day trip. Can you help me compare activities, timing, transport, and availability?\n\nPage: {url}",
      day_trips_es: "Hola Mindo Tours, me interesa una excursión de un día a Mindo. ¿Pueden ayudarme a comparar actividades, horarios, transporte y disponibilidad?\n\nPágina: {url}",
      private_tours_en: "Hi Mindo Tours, I am interested in a private custom tour in Mindo. Can you help me plan the route, timing, and availability?\n\nPage: {url}",
      private_tours_es: "Hola Mindo Tours, me interesa un tour privado personalizado en Mindo. ¿Pueden ayudarme a planificar la ruta, el horario y la disponibilidad?\n\nPágina: {url}",
      contact_page_en: "Hi Mindo Tours, I am planning a visit to Mindo and would like help with activities, tours, or transport. Can you help me choose the right next step?\n\nPage: {url}",
      contact_page_es: "Hola Mindo Tours, estoy planificando una visita a Mindo y quisiera ayuda con actividades, tours o transporte. ¿Pueden ayudarme a elegir el siguiente paso?\n\nPágina: {url}",
      birdwatching_en: "Hi Mindo Tours, I am interested in birdwatching in Mindo. Can your Mindo Bird Watching team help me choose the right tour?\n\nPage: {url}",
      birdwatching_es: "Hola Mindo Tours, me interesa el avistamiento de aves en Mindo. ¿Su equipo de Mindo Bird Watching puede ayudarme a elegir el tour adecuado?\n\nPágina: {url}",
      chocolate_tour_en: "Hi Mindo Tours, I am interested in a chocolate tour in Mindo. Can you confirm availability and help me fit it into my itinerary?\n\nPage: {url}",
      chocolate_tour_es: "Hola Mindo Tours, me interesa un tour de chocolate en Mindo. ¿Pueden confirmar disponibilidad y ayudarme a integrarlo en mi itinerario?\n\nPágina: {url}",
      waterfall_hike_en: "Hi Mindo Tours, I am interested in a guided waterfall hike in Mindo. Can you confirm availability and help me choose a route for my group?\n\nPage: {url}",
      waterfall_hike_es: "Hola Mindo Tours, me interesa un tour guiado de cascadas en Mindo. ¿Pueden confirmar disponibilidad y ayudarme a elegir una ruta para mi grupo?\n\nPágina: {url}",
      travel_guide_hub_en: "Hi Mindo Tours, I am planning a visit to Mindo. Can you help me organize the timing, transport, activities, and availability for my dates?\n\nPage: {url}",
      travel_guide_hub_es: "Hola Mindo Tours, estoy planificando una visita a Mindo. ¿Pueden ayudarme a organizar horarios, transporte, actividades y disponibilidad para mis fechas?\n\nPágina: {url}",
      ziplining_en: "Hi Mindo Tours, I am interested in ziplining in Mindo. Can you confirm the current option, requirements, timing, and availability for my group?\n\nPage: {url}",
      ziplining_es: "Hola Mindo Tours, me interesa hacer canopy en Mindo. ¿Pueden confirmar la opción actual, requisitos, horario y disponibilidad para mi grupo?\n\nPágina: {url}",
      tubing_en: "Hi Mindo Tours, I am interested in river tubing in Mindo. Can you confirm the current route, river conditions, requirements, timing, and availability for my group?\n\nPage: {url}",
      tubing_es: "Hola Mindo Tours, me interesa hacer tubing en el río en Mindo. ¿Pueden confirmar la ruta actual, condiciones, requisitos, horario y disponibilidad para mi grupo?\n\nPágina: {url}",
      canyoning_en: "Hi Mindo Tours, I am interested in canyoning near Mindo. Can you confirm the current route, requirements, timing, inclusions, and availability for my group?\n\nPage: {url}",
      canyoning_es: "Hola Mindo Tours, me interesa hacer canyoning cerca de Mindo. ¿Pueden confirmar la ruta actual, requisitos, horario, inclusiones y disponibilidad para mi grupo?\n\nPágina: {url}"
    }
  };

  function pageLanguage() {
    var lang = document.documentElement.getAttribute("lang") || "en";
    return String(lang).toLowerCase().indexOf("es") === 0 ? "es" : "en";
  }

  function safeMessageKey(requested) {
    var messages = window.MT_SITE_CONFIG.whatsappMessages;
    if (requested && messages[requested]) return requested;
    return pageLanguage() === "es" ? "default_es" : "default_en";
  }

  function buildWhatsAppUrl(requested) {
    var config = window.MT_SITE_CONFIG;
    var number = String(config.contact.whatsappNumberDigits || "").replace(/\D/g, "");
    var key = safeMessageKey(requested);
    var message = String(config.whatsappMessages[key] || "").replace("{url}", window.location.href);
    return number ? "https://wa.me/" + number + "?text=" + encodeURIComponent(message) : "#";
  }

  function updateWhatsAppLinks(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var links = scope.querySelectorAll("[data-whatsapp-message-key]");
    Array.prototype.forEach.call(links, function (link) {
      var key = safeMessageKey(link.getAttribute("data-whatsapp-message-key"));
      link.href = buildWhatsAppUrl(key);
      link.setAttribute("data-whatsapp-message-key", key);
      link.setAttribute("data-analytics-message-key", key);
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  }

  function updateContactDetails(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var email = String(window.MT_SITE_CONFIG.contact.email || "").trim();

    Array.prototype.forEach.call(scope.querySelectorAll("[data-contact-email-text]"), function (element) {
      element.textContent = email;
    });

    Array.prototype.forEach.call(scope.querySelectorAll("[data-contact-email-link]"), function (link) {
      var subject = String(link.getAttribute("data-email-subject") || "").trim();
      link.href = email ? "mailto:" + email + (subject ? "?subject=" + encodeURIComponent(subject) : "") : "#";
    });
  }

  function observeIncludes() {
    if (!("MutationObserver" in window)) return;
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes, function (node) {
          if (!node || node.nodeType !== 1) return;
          if (node.matches && node.matches("[data-whatsapp-message-key]")) {
            updateWhatsAppLinks(node.parentNode || document);
          } else if (node.querySelector) {
            updateWhatsAppLinks(node);
          }
          updateContactDetails(node.parentNode || document);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.MT_SITE_CONFIG.buildWhatsAppUrl = buildWhatsAppUrl;
  window.MT_SITE_CONFIG.updateWhatsAppLinks = updateWhatsAppLinks;
  window.MT_SITE_CONFIG.updateContactDetails = updateContactDetails;

  function initializePublicConfig() {
    updateWhatsAppLinks();
    updateContactDetails();
    observeIncludes();
    window.dispatchEvent(new CustomEvent("mt:config-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePublicConfig);
  } else {
    initializePublicConfig();
  }
})();
