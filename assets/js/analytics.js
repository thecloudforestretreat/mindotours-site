/* Mindo Tours analytics and attribution foundation.
 * Captures anonymous first/last-touch context and propagates it to lead forms.
 */
(function () {
  "use strict";

  if (window.MT_ANALYTICS) return;

  var config = window.MT_SITE_CONFIG || {};
  var GA_ID = config.analytics && config.analytics.ga4MeasurementId
    ? String(config.analytics.ga4MeasurementId)
    : "";
  var GTM_ID = config.analytics && config.analytics.gtmContainerId
    ? String(config.analytics.gtmContainerId)
    : "";
  var DIRECT_GA4_FALLBACK_DELAY_MS = 2500;
  var pendingDirectEvents = [];
  var directFallbackTimer = null;
  var directFallbackActive = false;
  var STORAGE_KEY = "mt_attribution_v1";
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  var MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  var TRACKING_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_source_platform",
    "utm_content", "utm_term", "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid"
  ];
  var SOURCE_SITE = config.sourceSite ? String(config.sourceSite) : "mindotours";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
    wait_for_update: 500
  });

  function loadGTM() {
    if (!GTM_ID || document.querySelector('script[data-mt-gtm="true"]') ||
        document.querySelector('script[src*="googletagmanager.com/gtm.js?id=' + GTM_ID + '"]')) return;
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID);
    script.setAttribute("data-mt-gtm", "true");
    document.head.appendChild(script);
  }

  function gtmOwnsGa4() {
    return window.__mbwGtmOwnsGa4 === true;
  }

  function ensureDirectGa4() {
    if (!GA_ID) return;
    if (!document.querySelector('script[src*="googletagmanager.com/gtag/js?id=' + GA_ID + '"]')) {
      var script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
      document.head.appendChild(script);
    }
    if (!window.__mtGa4Configured) {
      window.__mtGa4Configured = true;
      window.gtag("js", new Date());
      window.gtag("config", GA_ID, {
        send_page_view: true,
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
        linker: { domains: ["mindotours.com", "mindobirdwatching.com"] }
      });
    }
  }

  function activateDirectFallback() {
    directFallbackTimer = null;
    if (gtmOwnsGa4()) {
      pendingDirectEvents = [];
      return;
    }
    directFallbackActive = true;
    ensureDirectGa4();
    pendingDirectEvents.forEach(function (queued) {
      window.gtag("event", queued.name, queued.payload);
    });
    pendingDirectEvents = [];
  }

  function queueDirectFallbackEvent(name, payload) {
    if (!GA_ID || gtmOwnsGa4()) return;
    if (directFallbackActive) {
      window.gtag("event", name, payload);
      return;
    }
    pendingDirectEvents.push({ name: name, payload: payload });
    if (directFallbackTimer === null) {
      directFallbackTimer = window.setTimeout(activateDirectFallback, DIRECT_GA4_FALLBACK_DELAY_MS);
    }
  }

  loadGTM();

  function clean(value, maxLength) {
    if (value === null || value === undefined) return "";
    return String(value).trim().slice(0, maxLength || 255);
  }

  function makeId(prefix) {
    var value = "";
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      value = window.crypto.randomUUID();
    } else if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      value = Array.prototype.map.call(bytes, function (byte) {
        return byte.toString(16).padStart(2, "0");
      }).join("");
    } else {
      value = Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
    return prefix + "_" + value;
  }

  function language() {
    var lang = document.documentElement.getAttribute("lang") || "en";
    return String(lang).toLowerCase().indexOf("es") === 0 ? "es" : "en";
  }

  function pageType() {
    if (document.body && document.body.dataset.pageType) return clean(document.body.dataset.pageType, 80);
    var path = window.location.pathname.replace(/^\/|\/$/g, "");
    return path ? path.split("/").pop().replace(/-/g, "_") : "home";
  }

  function externalReferrer() {
    if (!document.referrer) return "";
    try {
      var referrer = new URL(document.referrer);
      return referrer.origin === window.location.origin ? "" : (referrer.origin + referrer.pathname).slice(0, 2048);
    } catch (error) {
      return "";
    }
  }

  function queryValues() {
    var query = new URLSearchParams(window.location.search || "");
    var values = {};
    TRACKING_KEYS.forEach(function (key) { values[key] = clean(query.get(key), 512); });
    return values;
  }

  function classifyTouch(values) {
    var source = values.utm_source;
    var medium = values.utm_medium;
    var referrer = externalReferrer();
    var referrerHost = "";
    if (referrer) {
      try { referrerHost = new URL(referrer).hostname.replace(/^www\./, ""); } catch (error) {}
    }

    if (!source && (values.gclid || values.gbraid || values.wbraid)) {
      source = "google";
      medium = "paid_search";
    } else if (!source && values.fbclid) {
      source = "meta";
      medium = "paid_social";
    } else if (!source && values.msclkid) {
      source = "microsoft";
      medium = "paid_search";
    } else if (!source && values.ttclid) {
      source = "tiktok";
      medium = "paid_social";
    } else if (!source && referrerHost) {
      source = referrerHost;
      medium = /google\.|bing\.|yahoo\.|duckduckgo\./i.test(referrerHost) ? "organic" : "referral";
    } else if (!source) {
      source = "direct";
      medium = "none";
    }

    return {
      source: clean(source),
      medium: clean(medium || "unknown"),
      campaign: clean(values.utm_campaign),
      campaign_id: clean(values.utm_id),
      source_platform: clean(values.utm_source_platform),
      content: clean(values.utm_content),
      term: clean(values.utm_term),
      landing_page: (window.location.origin + window.location.pathname).slice(0, 2048),
      referrer: referrer,
      captured_at: new Date().toISOString()
    };
  }

  function readState() {
    try {
      var value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (!value || !value.updated_at || Date.parse(value.updated_at) < Date.now() - MAX_AGE_MS) return null;
      return value;
    } catch (error) {
      return null;
    }
  }

  function saveState(value) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (error) {}
  }

  function hasInboundSignal(values) {
    return TRACKING_KEYS.some(function (key) { return Boolean(values[key]); }) || Boolean(externalReferrer());
  }

  function currentState() {
    var now = new Date().toISOString();
    var values = queryValues();
    var state = readState();
    if (!state) {
      var initialTouch = classifyTouch(values);
      state = {
        visitor_id: makeId("v"),
        session_id: makeId("s"),
        session_started_at: now,
        last_activity_at: now,
        first_touch: initialTouch,
        last_touch: initialTouch,
        click_ids: {},
        updated_at: now
      };
    } else {
      var lastActivity = Date.parse(state.last_activity_at || "") || 0;
      if (lastActivity < Date.now() - SESSION_TIMEOUT_MS) {
        state.session_id = makeId("s");
        state.session_started_at = now;
      }
      if (hasInboundSignal(values)) state.last_touch = classifyTouch(values);
      state.last_activity_at = now;
      state.updated_at = now;
    }
    ["gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid"].forEach(function (key) {
      if (values[key]) state.click_ids[key] = values[key];
    });
    saveState(state);
    return state;
  }

  var state = currentState();

  function context(extra) {
    var base = {
      source_site: SOURCE_SITE,
      source_domain: window.location.hostname,
      page_language: language(),
      page_type: pageType(),
      product_family: document.body && document.body.dataset.productFamily
        ? clean(document.body.dataset.productFamily, 80)
        : "",
      page_path: window.location.pathname,
      visitor_id: state.visitor_id,
      session_id: state.session_id,
      first_source: state.first_touch.source,
      first_medium: state.first_touch.medium,
      last_source: state.last_touch.source,
      last_medium: state.last_touch.medium,
      last_campaign: state.last_touch.campaign || ""
    };
    Object.keys(extra || {}).forEach(function (key) { base[key] = extra[key]; });
    return base;
  }

  function track(eventName, parameters) {
    var payload = context(parameters || {});
    var gtmPayload = { event: "mbw_event", mbw_event_name: eventName };
    Object.keys(payload).forEach(function (key) { gtmPayload[key] = payload[key]; });
    window.dataLayer.push(gtmPayload);
    queueDirectFallbackEvent(eventName, payload);
  }

  function fieldValues() {
    var status = state.last_touch && state.last_touch.source === "direct"
      ? "direct"
      : (state.last_touch && state.last_touch.source && state.last_touch.medium ? "captured" : "partial");
    var current = state.last_touch || {};
    var values = {
      source_site: SOURCE_SITE,
      source_domain: window.location.hostname,
      page_language: language(),
      source_page: window.location.href,
      website_visitor_id: state.visitor_id,
      website_session_id: state.session_id,
      attribution_status: status,
      attribution_quality: status === "captured" ? "verified" : "partial",
      first_touch_source: state.first_touch.source || "",
      first_touch_medium: state.first_touch.medium || "",
      first_touch_campaign: state.first_touch.campaign || "",
      first_touch_content: state.first_touch.content || "",
      first_touch_term: state.first_touch.term || "",
      first_touch_landing_page: state.first_touch.landing_page || "",
      first_touch_referrer: state.first_touch.referrer || "",
      first_touch_date: state.first_touch.captured_at || "",
      last_touch_source: current.source || "",
      last_touch_medium: current.medium || "",
      last_touch_campaign: current.campaign || "",
      last_touch_content: current.content || "",
      last_touch_term: current.term || "",
      last_touch_landing_page: current.landing_page || "",
      last_touch_referrer: current.referrer || "",
      last_touch_date: current.captured_at || "",
      utm_source: current.source === "direct" ? "" : (current.source || ""),
      utm_medium: current.medium === "none" ? "" : (current.medium || ""),
      utm_campaign: current.campaign || "",
      utm_content: current.content || "",
      utm_term: current.term || ""
    };
    Object.keys(state.click_ids || {}).forEach(function (key) {
      values[key] = state.click_ids[key];
    });
    return values;
  }

  function decorateForm(form) {
    var values = fieldValues();
    var contactIntentField = form.querySelector('input[name="contact_intent_id"]');
    if (!contactIntentField) {
      contactIntentField = document.createElement("input");
      contactIntentField.type = "hidden";
      contactIntentField.name = "contact_intent_id";
      form.appendChild(contactIntentField);
    }
    if (!contactIntentField.value) contactIntentField.value = makeId("ci");
    Object.keys(values).forEach(function (name) {
      var field = form.querySelector('input[name="' + name + '"]');
      if (!field) {
        field = document.createElement("input");
        field.type = "hidden";
        field.name = name;
        form.appendChild(field);
      }
      field.value = values[name];
    });
  }

  function identifyLink(link) {
    var href = link.href || "";
    if (/wa\.me\//i.test(href)) return { event: "whatsapp_click", destination: "whatsapp" };
    if (/mindobirdwatching\.com/i.test(href)) return { event: "outbound_mbw_click", destination: "mindobirdwatching" };
    if (/^mailto:/i.test(href)) return { event: "email_click", destination: "email" };
    if (/^tel:/i.test(href)) return { event: "phone_click", destination: "phone" };
    if (link.matches(".btn-book, .btn-tour, .btn-contact, .btn, [data-analytics-event]")) {
      return { event: link.getAttribute("data-analytics-event") || "cta_click", destination: "internal" };
    }
    return null;
  }

  function bindDocumentEvents() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest("a");
      if (!link) return;
      var identity = identifyLink(link);
      if (!identity) return;
      track(identity.event, {
        link_url: clean(link.href, 2048),
        link_text: clean(link.getAttribute("aria-label") || link.textContent, 100),
        destination: identity.destination,
        cta_location: clean(link.getAttribute("data-cta-location"), 80),
        message_key: clean(link.getAttribute("data-analytics-message-key"), 80)
      });
    });

    document.querySelectorAll("form").forEach(function (form) {
      decorateForm(form);
      var started = false;
      form.addEventListener("focusin", function () {
        if (started) return;
        started = true;
        track("form_start", { form_id: form.id || "unnamed_form" });
      });
      form.addEventListener("submit", function () {
        decorateForm(form);
        track("form_submit_attempt", { form_id: form.id || "unnamed_form" });
      });
    });
  }

  window.MT_ANALYTICS = {
    version: "1.0.0",
    state: state,
    track: track,
    decorateForm: decorateForm,
    formSuccess: function (form, extra) {
      track("generate_lead", Object.assign({ form_id: form && form.id ? form.id : "unnamed_form" }, extra || {}));
    },
    formError: function (form, extra) {
      track("form_submit_error", Object.assign({ form_id: form && form.id ? form.id : "unnamed_form" }, extra || {}));
    },
    updateConsent: function (consent) {
      window.gtag("consent", "update", consent || {});
    }
  };

  track("page_view_enhanced", {
    page_title: document.title,
    page_location: window.location.href,
    page_referrer: document.referrer
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindDocumentEvents);
  } else {
    bindDocumentEvents();
  }
})();
