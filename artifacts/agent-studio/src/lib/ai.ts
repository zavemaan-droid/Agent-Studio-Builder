interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─ Endpoints ───────────────────────
// New authenticated endpoint (gen.pollinations.ai)
const GEN_POLL_URL  = "https://gen.pollinations.ai/v1/chat/completions";
// Legacy anonymous endpoint (still works, lower priority)
const TEXT_POLL_URL = "https://text.pollinations.ai/openai";
const TEXT_POLL_GET = "https://text.pollinations.ai/";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ─ Retry helper ──────────────────────────
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  baseDelayMs = 600
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 20000);
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

// ─ SSE stream reader ───────────────────────
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

// ─ gen.pollinations.ai (authenticated, best quality) ─
async function callGenPollinations(
  messages: Message[],
  apiKey: string,
  onChunk?: (full: string) => void
): Promise<string> {
  const res = await fetchWithRetry(GEN_POLL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai-fast",
      messages,
      temperature: 0.4,
      stream: !!onChunk,
    }),
  });
  if (onChunk && res.body) return readSSEStream(res.body, onChunk);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "";
  onChunk?.(text);
  if (!text) throw new Error("Empty gen.pollinations.ai response");
  return text;
}

// ─ text.pollinations.ai POST (anonymous, legacy)  ─
async function callPollinationsStream(
  messages: Message[],
  onChunk?: (full: string) => void
): Promise<string> {
  const res = await fetchWithRetry(TEXT_POLL_URL, {
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
  if (!text) throw new Error("Empty Pollinations POST response");
  return text;
}

// ─ text.pollinations.ai GET (simplest anonymous fallback) ─
async function callPollinationsGet(
  messages: Message[],
  onChunk?: (full: string) => void
): Promise<string> {
  const sys  = messages.find(m => m.role === "system")?.content ?? "";
  const user = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
  const combined = sys ? `${sys.slice(0, 400)}\n\n${user.slice(0, 400)}` : user.slice(0, 600);
  const url = `${TEXT_POLL_GET}${encodeURIComponent(combined)}?model=openai-fast&seed=${Date.now() % 9999}`;
  const res = await fetchWithRetry(url, { method: "GET" }, 1, 400);
  const text = (await res.text()).trim();
  if (!text) throw new Error("Empty Pollinations GET response");
  onChunk?.(text);
  return text;
}

// ─ Groq ──────────────────────────────────────────────
async function callGroq(
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

// ─ Public API ───────────────────────────────────────────
// Priority:
//   1. gen.pollinations.ai (if pollinationsKey provided - new authenticated API)
//   2. Groq (if groqKey provided - free at console.groq.com)
//   3. text.pollinations.ai POST (anonymous fallback)
//   4. text.pollinations.ai GET  (simplest fallback)
//   5. Throw - never return fake "offline" text
export async function callAI(
  messages: Message[],
  settings?: { groqKey?: string; pollinationsKey?: string },
  onChunk?: (fullText: string) => void
): Promise<string> {
  // 1. New gen.pollinations.ai (authenticated, best quality + higher limits)
  if (settings?.pollinationsKey && settings.pollinationsKey.trim().length > 10) {
    try {
      return await callGenPollinations(messages, settings.pollinationsKey, onChunk);
    } catch (e) {
      console.warn("[AI] gen.pollinations.ai failed:", (e as Error).message);
    }
  }

  // 2. Groq (fast, free, requires key)
  if (settings?.groqKey && settings.groqKey.trim().length > 20) {
    try {
      return await callGroq(messages, settings.groqKey, onChunk);
    } catch (e) {
      console.warn("[AI] Groq failed:", (e as Error).message);
    }
  }

  // 3. text.pollinations.ai POST (anonymous - still works, legacy)
  try {
    return await callPollinationsStream(messages, onChunk);
  } catch (e) {
    console.warn("[AI] Pollinations POST failed:", (e as Error).message);
  }

  // 4. text.pollinations.ai GET (most basic fallback)
  try {
    return await callPollinationsGet(messages, onChunk);
  } catch (e) {
    console.warn("[AI] Pollinations GET failed:", (e as Error).message);
  }

  // 5. All providers failed - throw, never fake a response
  throw new Error(
    "All AI providers unavailable. " +
    "Get a free key at enter.pollinations.ai or console.groq.com and add it in Settings."
  );
}

export async function pingPollinations(): Promise<boolean> {
  try {
    const res = await fetch("https://text.pollinations.ai/models", {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch { return false; }
}
