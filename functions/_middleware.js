export async function onRequest(context) {
  const response = await context.next();
  const hostname = new URL(context.request.url).hostname.toLowerCase();
  const isNonProductionHost =
    hostname === "staging.mindotours.com" ||
    hostname.endsWith(".mindotours-site.pages.dev");

  if (!isNonProductionHost) return response;

  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
