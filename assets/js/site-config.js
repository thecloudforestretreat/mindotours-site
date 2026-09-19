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
      private_tours_en: "Hi Mindo Tours, I am interested in a private custom tour in Mindo. Can you help me plan the route, timing, and price?\n\nPage: {url}",
      private_tours_es: "Hola Mindo Tours, me interesa un tour privado personalizado en Mindo. ¿Pueden ayudarme a planificar la ruta, el horario y el precio?\n\nPágina: {url}",
      birdwatching_en: "Hi Mindo Tours, I am interested in birdwatching in Mindo. Can your Mindo Bird Watching team help me choose the right tour?\n\nPage: {url}",
      birdwatching_es: "Hola Mindo Tours, me interesa el avistamiento de aves en Mindo. ¿Su equipo de Mindo Bird Watching puede ayudarme a elegir el tour adecuado?\n\nPágina: {url}"
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
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.MT_SITE_CONFIG.buildWhatsAppUrl = buildWhatsAppUrl;
  window.MT_SITE_CONFIG.updateWhatsAppLinks = updateWhatsAppLinks;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      updateWhatsAppLinks();
      observeIncludes();
    });
  } else {
    updateWhatsAppLinks();
    observeIncludes();
  }
})();
