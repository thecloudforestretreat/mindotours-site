(function () {
  "use strict";

  function initCarousel(root) {
    var track = root.querySelector(".carouselTrack");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".carouselSlide"));
    var dots = Array.prototype.slice.call(root.querySelectorAll(".dot"));
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    var count = root.querySelector("[data-count]");
    if (!track || !slides.length) return;
    var index = 0;
    var timer = null;
    function render() {
      track.style.transform = "translateX(-" + (index * 100) + "%)";
      dots.forEach(function (dot, i) { dot.classList.toggle("is-active", i === index); });
      if (count) count.textContent = (index + 1) + " / " + slides.length;
    }
    function go(step) { index = (index + step + slides.length) % slides.length; render(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() { stop(); timer = setInterval(function () { go(1); }, 3600); }
    if (prev) prev.addEventListener("click", function () { go(-1); start(); });
    if (next) next.addEventListener("click", function () { go(1); start(); });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);
    render();
    start();
  }

  function titleCaseName(value) {
    return String(value || "").toLowerCase().replace(/\b([a-záéíóúñü])/g, function (match) {
      return match.toUpperCase();
    });
  }

  function initForm(form) {
    var startDate = document.getElementById("startDate");
    var endDate = document.getElementById("endDate");
    var datesCombined = document.getElementById("datesCombined");
    var sourcePage = document.getElementById("sourcePage");
    var uaField = document.getElementById("uaField");
    var tsStart = document.getElementById("tsStart");
    var submitBtn = document.getElementById("submitBtn");
    var successEl = document.getElementById("formSuccessMsg");
    var errorEl = document.getElementById("formErrorMsg");
    var labels = {
      submit: form.dataset.submitLabel || "Send Booking Request",
      sending: form.dataset.sendingLabel || "Sending Request...",
      dateError: form.dataset.dateError || "Please choose at least one date before sending your request.",
      securityError: form.dataset.securityError || "Please complete the security check and try again.",
      genericError: form.dataset.genericError || "We could not submit the request right now. Please try again, or use WhatsApp or email instead.",
      dateJoiner: form.dataset.dateJoiner || " to "
    };

    function todayIso() {
      var date = new Date();
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }
    function applyDateMins() {
      var min = todayIso();
      if (startDate) startDate.min = min;
      if (endDate) endDate.min = min;
    }
    function syncDates() {
      var start = startDate && startDate.value ? startDate.value : "";
      var end = endDate && endDate.value ? endDate.value : "";
      if (start && endDate) {
        endDate.min = start;
        if (end && end < start) { endDate.value = start; end = start; }
      }
      if (start && end && start !== end) datesCombined.value = start + labels.dateJoiner + end;
      else datesCombined.value = start || end || "";
    }
    function resetMessages() {
      if (successEl) successEl.style.display = "none";
      if (errorEl) errorEl.style.display = "none";
    }
    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.style.display = "block";
    }
    function setSubmitting(state) {
      if (!submitBtn) return;
      submitBtn.disabled = state;
      submitBtn.textContent = state ? labels.sending : labels.submit;
    }

    ["firstName", "lastName"].forEach(function (id) {
      var field = document.getElementById(id);
      if (field) field.addEventListener("blur", function () { field.value = titleCaseName(field.value.trim()); });
    });
    applyDateMins();
    if (startDate) startDate.addEventListener("change", syncDates);
    if (endDate) endDate.addEventListener("change", syncDates);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      resetMessages();
      syncDates();
      if (sourcePage) sourcePage.value = window.location.href;
      if (uaField) uaField.value = navigator.userAgent || "";
      if (tsStart) tsStart.value = String(Date.now());
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (!datesCombined.value) { showError(labels.dateError); return; }
      var formData = new FormData(form);
      if (!formData.get("cf-turnstile-response")) { showError(labels.securityError); return; }
      setSubmitting(true);
      try {
        var response = await fetch("/api/book-tour", { method: "POST", body: formData });
        var data;
        try { data = await response.json(); } catch (jsonError) { data = {}; }
        if (!response.ok || !data.ok) {
          var diagnostic = "";
          if (window.location.hostname === "staging.mindotours.com" && Array.isArray(data.turnstile_error_codes) && data.turnstile_error_codes.length) {
            diagnostic = " [" + data.turnstile_error_codes.join(", ") + "]";
          }
          throw new Error((data.message || labels.genericError) + diagnostic);
        }
        if (successEl) successEl.style.display = "block";
        if (window.MT_ANALYTICS) window.MT_ANALYTICS.formSuccess(form, { lead_type: "tour_request", page_language: form.dataset.language || "en" });
        form.reset();
        if (datesCombined) datesCombined.value = "";
        applyDateMins();
        if (window.MT_TURNSTILE) { try { window.MT_TURNSTILE.reset(); } catch (error) {} }
      } catch (error) {
        if (window.MT_ANALYTICS) window.MT_ANALYTICS.formError(form, { error_type: "booking_submission", page_language: form.dataset.language || "en" });
        showError(error.message || labels.genericError);
        if (successEl) successEl.style.display = "none";
      } finally {
        setSubmitting(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-carousel]").forEach(initCarousel);
    var form = document.getElementById("bookTourForm");
    if (form) initForm(form);
  });
})();
