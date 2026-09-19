/* Explicit Turnstile bootstrap using the public site key from site-config.js. */
(function () {
  "use strict";

  var widgetId = null;

  function renderTurnstile() {
    if (widgetId !== null || !window.turnstile) return;

    var target = document.querySelector("[data-turnstile-widget]");
    var config = window.MT_SITE_CONFIG || {};
    var siteKey = config.turnstile && config.turnstile.siteKey
      ? String(config.turnstile.siteKey)
      : "";

    if (!target || !siteKey) return;

    widgetId = window.turnstile.render(target, {
      sitekey: siteKey,
      theme: target.getAttribute("data-theme") || "light",
      action: target.getAttribute("data-action") || "book_tour"
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
