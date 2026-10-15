export function validateWorkerBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("AI worker URL must be an absolute URL.");
  }
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("AI worker URL must use HTTP(S) and must not contain embedded credentials.");
  }
  if (url.protocol !== "https:" && !localHosts.has(url.hostname)) {
    throw new Error("Remote AI worker endpoints must use HTTPS.");
  }
  url.hash = "";
  return url;
}
