/* Mindo Tours global head bootstrap.
 * Keep shared configuration and measurement in one place for every EN/ES page.
 */
(function () {
  "use strict";

  if (window.MT_HEAD_LOADED) return;
  window.MT_HEAD_LOADED = true;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  loadScript("/assets/js/site-config.js?v=20260920-18")
    .then(function () {
      return loadScript("/assets/js/analytics.js?v=20260919-4");
    })
    .catch(function (error) {
      if (window.console && console.error) {
        console.error("Mindo Tours global scripts failed to load.", error);
      }
    });
})();
