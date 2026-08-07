/**
 * Browser fetch for public APIs with timeout, retry and host fallback.
 * On flaky .ru / VPN paths the first request often fails; vercel.app often works.
 */

const FALLBACK_HOST = (
  process.env.NEXT_PUBLIC_API_FALLBACK ||
  process.env.NEXT_PUBLIC_ASSET_HOST ||
  "https://serafinna.vercel.app"
).replace(/\/$/, "");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function bases(): string[] {
  const list: string[] = [""]; // same origin first
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    if (FALLBACK_HOST && FALLBACK_HOST !== origin) {
      list.push(FALLBACK_HOST);
    }
  } else if (FALLBACK_HOST) {
    list.push(FALLBACK_HOST);
  }
  return list;
}

export type PublicApiInit = RequestInit & {
  /** per-attempt timeout (ms) */
  timeoutMs?: number;
  /** retries per host after network failure */
  retries?: number;
};

/**
 * @param path absolute path starting with /api/...
 */
export async function publicApiFetch(
  path: string,
  init: PublicApiInit = {}
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? 22000;
  const retries = init.retries ?? 1;
  const { timeoutMs: _t, retries: _r, ...fetchInit } = init;
  const p = path.startsWith("/") ? path : `/${path}`;

  let lastError: unknown;

  for (const base of bases()) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(`${base}${p}`, {
          ...fetchInit,
          signal: ctrl.signal,
          cache: fetchInit.cache ?? "no-store",
        });
        // Business errors (4xx) are valid — do not try another host
        // Retry only gateway failures
        if (res.status >= 502 && res.status <= 504 && attempt < retries) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        return res;
      } catch (e) {
        lastError = e;
        if (attempt < retries) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        // try next host
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Сеть недоступна");
}
