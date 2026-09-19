export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (request.method !== "POST") {
      return json({ ok: false, message: "Method not allowed." }, 405);
    }

    if (!env.TURNSTILE_SECRET_KEY || !env.BOOK_TOUR_APPS_SCRIPT_URL || !env.CF_SHARED_SECRET) {
      console.error("Booking endpoint is missing one or more required environment variables.");
      return json({ ok: false, message: "The booking service is temporarily unavailable." }, 503);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data") && !contentType.toLowerCase().includes("application/x-www-form-urlencoded")) {
      return json({
        ok: false,
        message: "Unsupported content type. Submit the form as multipart/form-data or application/x-www-form-urlencoded."
      }, 400);
    }

    const formData = await request.formData();

    const honeypot = String(formData.get("website") || "").trim();
    if (honeypot) {
      return json({ ok: false, message: "Spam protection triggered." }, 400);
    }

    const turnstileToken = String(formData.get("cf-turnstile-response") || "").trim();
    if (!turnstileToken) {
      return json({ ok: false, message: "Missing Turnstile token." }, 400);
    }

    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-forwarded-for") ||
      "";

    const verifyBody = new URLSearchParams();
    verifyBody.append("secret", env.TURNSTILE_SECRET_KEY);
    verifyBody.append("response", turnstileToken);
    if (ip) verifyBody.append("remoteip", ip);

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: verifyBody.toString()
    });

    let verifyJson = {};
    try {
      verifyJson = await verifyRes.json();
    } catch (err) {
      console.error("Turnstile returned a non-JSON response.", verifyRes.status);
      return json({ ok: false, message: "Security verification is temporarily unavailable." }, 502);
    }

    if (!verifyRes.ok) {
      console.error("Turnstile verification request failed.", verifyRes.status);
      return json({ ok: false, message: "Security verification is temporarily unavailable." }, 502);
    }

    if (!verifyJson.success) {
      console.warn("Turnstile verification failed.", verifyJson["error-codes"] || []);
      return json({ ok: false, message: "Security verification failed. Please try again." }, 403);
    }

    if (!isAllowedTurnstileHostname(verifyJson.hostname, env.TURNSTILE_ALLOWED_HOSTNAMES)) {
      console.warn("Turnstile hostname was rejected.", verifyJson.hostname || "missing");
      return json({ ok: false, message: "Security verification failed. Please try again." }, 403);
    }

    if (verifyJson.action && verifyJson.action !== "book_tour") {
      console.warn("Turnstile action was rejected.", verifyJson.action);
      return json({ ok: false, message: "Security verification failed. Please try again." }, 403);
    }

    formData.set("cf_secret", env.CF_SHARED_SECRET);

    if (ip) {
      formData.set("ip_best_effort", ip);
    }

    const sourcePage = String(formData.get("source_page") || "").trim();
    if (!sourcePage) {
      formData.set("source_page", request.headers.get("Referer") || "");
    }

    const ua = request.headers.get("User-Agent") || "";
    if (!formData.get("user_agent") && ua) {
      formData.set("user_agent", ua);
    }

    formData.delete("cf-turnstile-response");
    formData.delete("website");

    const upstreamRes = await fetch(env.BOOK_TOUR_APPS_SCRIPT_URL, {
      method: "POST",
      body: formData
    });

    const text = await upstreamRes.text();

    let upstreamJson;
    try {
      upstreamJson = JSON.parse(text);
    } catch (err) {
      console.error("Booking destination returned a non-JSON response.", upstreamRes.status);
      return json({ ok: false, message: "The booking service could not process your request." }, 502);
    }

    if (!upstreamRes.ok) {
      console.error("Booking destination request failed.", upstreamRes.status);
      return json({ ok: false, message: "The booking service could not process your request." }, 502);
    }

    if (upstreamJson.ok === false) {
      console.error("Booking destination rejected the request.", upstreamRes.status);
      return json({ ok: false, message: "The booking service could not process your request." }, 502);
    }

    return json({
      ok: true,
      warning: upstreamJson.warning || ""
    });
  } catch (err) {
    console.error("Server error while processing booking request.", err);
    return json({ ok: false, message: "Server error while processing booking request." }, 500);
  }
}

function isAllowedTurnstileHostname(hostname, configuredHostnames) {
  const normalized = String(hostname || "").trim().toLowerCase();
  if (!normalized) return false;

  const allowed = new Set([
    "mindotours.com",
    "www.mindotours.com",
    "staging.mindotours.com",
    "codex-mindotours-staging.mindotours-site.pages.dev"
  ]);

  String(configuredHostnames || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .forEach((value) => allowed.add(value));

  return allowed.has(normalized) || /^[a-f0-9]{8}\.mindotours-site\.pages\.dev$/.test(normalized);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
