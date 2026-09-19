/* Explicit Turnstile bootstrap using the public site key from site-config.js. */
(function () {
  "use strict";

  var widgetId = null;

  function statusElement(target) {
    var status = target.parentNode && target.parentNode.querySelector("[data-turnstile-status]");
    if (status) return status;
    status = document.createElement("p");
    status.setAttribute("data-turnstile-status", "");
    status.setAttribute("aria-live", "polite");
    status.className = "help";
    status.hidden = true;
    target.insertAdjacentElement("afterend", status);
    return status;
  }

  function statusMessage(type) {
    var spanish = String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
    if (type === "expired") {
      return spanish
        ? "La verificación expiró. Se está cargando una nueva verificación."
        : "The security check expired. A new check is loading.";
    }
    return spanish
      ? "La verificación de seguridad no pudo completarse. Se intentará nuevamente; también puedes actualizar la página."
      : "The security check could not complete. It will retry automatically; you can also refresh the page.";
  }

  function renderTurnstile() {
    if (widgetId !== null || !window.turnstile) return;

    var target = document.querySelector("[data-turnstile-widget]");
    var config = window.MT_SITE_CONFIG || {};
    var siteKey = config.turnstile && config.turnstile.siteKey
      ? String(config.turnstile.siteKey)
      : "";

    if (!target || !siteKey) return;

    var status = statusElement(target);
    widgetId = window.turnstile.render(target, {
      sitekey: siteKey,
      theme: target.getAttribute("data-theme") || "light",
      action: target.getAttribute("data-action") || "book_tour",
      retry: "auto",
      "retry-interval": 8000,
      callback: function () {
        status.hidden = true;
        status.textContent = "";
      },
      "expired-callback": function () {
        status.textContent = statusMessage("expired");
        status.hidden = false;
      },
      "error-callback": function () {
        status.textContent = statusMessage("error");
        status.hidden = false;
      }
    });
  }

  window.mtTurnstileReady = renderTurnstile;
  window.addEventListener("mt:config-ready", renderTurnstile);
  document.addEventListener("DOMContentLoaded", renderTurnstile);

  window.MT_TURNSTILE = {
    render: renderTurnstile,
    reset: function () {
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    }
  };
})();
