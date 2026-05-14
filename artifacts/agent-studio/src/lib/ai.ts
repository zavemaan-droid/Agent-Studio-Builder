interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const POLL_OPENAI_URL = "https://text.pollinations.ai/openai";
const POLL_TEXT_URL   = "https://text.pollinations.ai/";
const GROQ_URL        = "https://api.groq.com/openai/v1/chat/completions";

// ── Retry helper ──────────────────────────────────────────────
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  baseDelayMs = 600
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 18000);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) return res;
      if (res.status < 500) throw new Error(`HTTP ${res.status}`);
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(tid);
      if ((err as Error).name === "AbortError" && i === retries) throw err;
      lastErr = err;
    }
    if (i < retries) await new Promise(r => setTimeout(r, baseDelayMs * (i + 1)));
  }
  throw lastErr;
}

// ── SSE stream reader ────────────────────────────────────────
async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (full: string) => void
): Promise<string> {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split("\n");
      for (const line of lines) {
        const t = line.trim();
        if (!t || t === "data: [DONE]" || !t.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(t.slice(6)) as { choices?: { delta?: { content?: string } }[] };
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) { full += delta; onChunk(full); }
        } catch { /* malformed SSE chunk */ }
      }
    }
  } finally { reader.releaseLock(); }
  return full;
}

// ── Pollinations OpenAI-compat (streaming) ───────────────────
async function callPollinationsStream(
  messages: Message[],
  onChunk?: (full: string) => void
): Promise<string> {
  const res = await fetchWithRetry(POLL_OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai-fast",
      messages,
      temperature: 0.4,
      private: true,
      stream: !!onChunk,
    }),
  });
  if (onChunk && res.body) return readSSEStream(res.body, onChunk);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "";
  onChunk?.(text);
  if (!text) throw new Error("Empty Pollinations response");
  return text;
}

// ── Pollinations text GET (most reliable fallback) ───────────
async function callPollinationsGet(
  messages: Message[],
  onChunk?: (full: string) => void
): Promise<string> {
  const sys  = messages.find(m => m.role === "system")?.content ?? "";
  const user = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
  const combined = sys ? `${sys.slice(0, 500)}\n\n${user}` : user;
  const url = `${POLL_TEXT_URL}${encodeURIComponent(combined)}?model=openai-fast&seed=${Date.now() % 9999}`;
  const res = await fetchWithRetry(url, { method: "GET" }, 1, 400);
  const text = (await res.text()).trim();
  if (!text) throw new Error("Empty Pollinations GET response");
  onChunk?.(text);
  return text;
}

// ── Groq ─────────────────────────────────────────────────────
async function callGroqStream(
  messages: Message[],
  apiKey: string,
  onChunk?: (full: string) => void
): Promise<string> {
  const res = await fetchWithRetry(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.4,
      stream: !!onChunk,
    }),
  });
  if (onChunk && res.body) return readSSEStream(res.body, onChunk);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "";
  onChunk?.(text);
  if (!text) throw new Error("Empty Groq response");
  return text;
}

// ── Public API ────────────────────────────────────────────────
export async function callAI(
  messages: Message[],
  settings?: { groqKey?: string },
  onChunk?: (fullText: string) => void
): Promise<string> {
  // 1. Try Groq first (fastest, if key available)
  if (settings?.groqKey && settings.groqKey.trim().length > 20) {
    try {
      return await callGroqStream(messages, settings.groqKey, onChunk);
    } catch (e) {
      console.warn("[AI] Groq failed:", (e as Error).message);
    }
  }

  // 2. Try Pollinations OpenAI-compat (streaming)
  try {
    return await callPollinationsStream(messages, onChunk);
  } catch (e) {
    console.warn("[AI] Pollinations stream failed:", (e as Error).message);
  }

  // 3. Try Pollinations simple GET (most reliable, avoids any CORS issues)
  try {
    return await callPollinationsGet(messages, onChunk);
  } catch (e) {
    console.warn("[AI] Pollinations GET failed:", (e as Error).message);
  }

  // 4. All providers failed — THROW so callers handle it properly
  // Never return fake "I'm in fallback mode" text — always throw
  throw new Error("All AI providers unavailable. Check your internet connection.");
}

export async function pingPollinations(): Promise<boolean> {
  try {
    const res = await fetch("https://text.pollinations.ai/models", {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch { return false; }
}
