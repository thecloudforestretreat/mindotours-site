export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (request.method !== "POST") {
      return json({ ok: false, message: "Method not allowed." }, 405);
    }

    if (!env.TURNSTILE_SECRET_KEY) {
      return json({ ok: false, message: "Missing TURNSTILE_SECRET_KEY in environment." }, 500);
    }

    if (!env.BOOK_TOUR_APPS_SCRIPT_URL) {
      return json({ ok: false, message: "Missing BOOK_TOUR_APPS_SCRIPT_URL in environment." }, 500);
    }

    if (!env.CF_SHARED_SECRET) {
      return json({ ok: false, message: "Missing CF_SHARED_SECRET in environment." }, 500);
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
      return json({
        ok: false,
        message: "Turnstile verification returned a non-JSON response.",
        turnstile_status: verifyRes.status
      }, 502);
    }

    if (!verifyRes.ok) {
      return json({
        ok: false,
        message: "Turnstile verification request failed.",
        turnstile_status: verifyRes.status,
        turnstile_response: verifyJson
      }, 502);
    }

    if (!verifyJson.success) {
      return json({
        ok: false,
        message: "Turnstile verification failed.",
        errors: verifyJson["error-codes"] || [],
        turnstile_response: verifyJson
      }, 403);
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
      return json({
        ok: false,
        message: "Apps Script returned a non-JSON response.",
        upstream_status: upstreamRes.status,
        raw: text
      }, 502);
    }

    if (!upstreamRes.ok) {
      return json({
        ok: false,
        message: upstreamJson.message || "Apps Script request failed.",
        warning: upstreamJson.warning || "",
        upstream_status: upstreamRes.status,
        upstream_response: upstreamJson
      }, 502);
    }

    if (upstreamJson.ok === false) {
      return json({
        ok: false,
        message: upstreamJson.message || "Upstream booking handler failed.",
        warning: upstreamJson.warning || "",
        upstream_status: upstreamRes.status,
        upstream_response: upstreamJson
      }, 502);
    }

    return json({
      ok: true,
      warning: upstreamJson.warning || ""
    });
  } catch (err) {
    return json({
      ok: false,
      message: "Server error while processing booking request.",
      error: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : ""
    }, 500);
  }
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
