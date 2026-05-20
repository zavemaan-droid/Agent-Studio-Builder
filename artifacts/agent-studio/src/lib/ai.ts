interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const GEN_POLL_URL  = "https://gen.pollinations.ai/v1/chat/completions";
const TEXT_POLL_URL = "https://text.pollinations.ai/openai";
const TEXT_POLL_GET = "https://text.pollinations.ai/";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const IMAGE_POLL_URL = "https://image.pollinations.ai/prompt/";

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, baseDelayMs = 600): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 20000);
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

async function readSSEStream(body: ReadableStream<Uint8Array>, onChunk: (full: string) => void): Promise<string> {
  const reader = body.getReader();
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

async function callGenPollinations(messages: Message[], apiKey: string, onChunk?: (full: string) => void): Promise<string> {
  const res = await fetchWithRetry(GEN_POLL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "openai-fast", messages, temperature: 0.4, stream: !!onChunk }),
  });
  if (onChunk && res.body) return readSSEStream(res.body, onChunk);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "";
  onChunk?.(text);
  if (!text) throw new Error("Empty gen.pollinations.ai response");
  return text;
}

async function callPollinationsStream(messages: Message[], onChunk?: (full: string) => void): Promise<string> {
  const res = await fetchWithRetry(TEXT_POLL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai-fast", messages, temperature: 0.4, private: true, stream: !!onChunk }),
  });
  if (onChunk && res.body) return readSSEStream(res.body, onChunk);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "";
  onChunk?.(text);
  if (!text) throw new Error("Empty Pollinations POST response");
  return text;
}

async function callPollinationsGet(messages: Message[], onChunk?: (full: string) => void): Promise<string> {
  const sys = messages.find(m => m.role === "system")?.content ?? "";
  const user = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
  const combined = sys ? `${sys.slice(0, 400)}\n\n${user.slice(0, 400)}` : user.slice(0, 600);
  const url = `${TEXT_POLL_GET}${encodeURIComponent(combined)}?model=openai-fast&seed=${Date.now() % 9999}`;
  const res = await fetchWithRetry(url, { method: "GET" }, 1, 400);
  const text = (await res.text()).trim();
  if (!text) throw new Error("Empty Pollinations GET response");
  onChunk?.(text);
  return text;
}

async function callGroq(messages: Message[], apiKey: string, onChunk?: (full: string) => void): Promise<string> {
  const res = await fetchWithRetry(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, temperature: 0.4, stream: !!onChunk }),
  });
  if (onChunk && res.body) return readSSEStream(res.body, onChunk);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "";
  onChunk?.(text);
  if (!text) throw new Error("Empty Groq response");
  return text;
}

// ─ Public: Text AI ───────────────────────────────────────────
// Priority:
//   1. gen.pollinations.ai (if pollinationsKey provided)
//   2. Groq (if groqKey provided)
//   3. text.pollinations.ai POST (anonymous fallback)
//   4. text.pollinations.ai GET  (simplest fallback)
//   5. Throw — never fake a response
export async function callAI(
  messages: Message[],
  settings?: { groqKey?: string; pollinationsKey?: string },
  onChunk?: (fullText: string) => void
): Promise<string> {
  if (settings?.pollinationsKey && settings.pollinationsKey.trim().length > 10) {
    try { return await callGenPollinations(messages, settings.pollinationsKey, onChunk); }
    catch (e) { console.warn("[AI] gen.pollinations.ai failed:", (e as Error).message); }
  }
  if (settings?.groqKey && settings.groqKey.trim().length > 20) {
    try { return await callGroq(messages, settings.groqKey, onChunk); }
    catch (e) { console.warn("[AI] Groq failed:", (e as Error).message); }
  }
  try { return await callPollinationsStream(messages, onChunk); }
  catch (e) { console.warn("[AI] Pollinations POST failed:", (e as Error).message); }
  try { return await callPollinationsGet(messages, onChunk); }
  catch (e) { console.warn("[AI] Pollinations GET failed:", (e as Error).message); }

  throw new Error(
    "All AI providers unavailable. " +
    "Get a free key at enter.pollinations.ai or console.groq.com and add it in Settings."
  );
}

// ─ Public: Image Generation ─────────────────────────────────
// Uses image.pollinations.ai — completely free, no API key required.
// Returns a URL that resolves to the generated JPEG image.
export interface ImageGenOptions {
  width?: number;
  height?: number;
  seed?: number;
  model?: string;   // default: "flux"
  nologo?: boolean;
  enhance?: boolean;
}

export async function generateImage(
  prompt: string,
  options: ImageGenOptions = {}
): Promise<string> {
  const {
    width   = 512,
    height  = 512,
    seed    = Math.floor(Math.random() * 999999),
    model   = "flux",
    nologo  = true,
    enhance = false,
  } = options;

  const params = new URLSearchParams({
    width:   String(width),
    height:  String(height),
    seed:    String(seed),
    model,
    nologo:  String(nologo),
    enhance: String(enhance),
  });

  const url = `${IMAGE_POLL_URL}${encodeURIComponent(prompt)}?${params.toString()}`;

  // Trigger the fetch so the browser caches it, then return the URL.
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 45000); // images can take ~15s on first hit
  try {
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`Image generation failed: HTTP ${res.status}`);
    return url;
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

// ─ Public: Video Storyboard (provider-ready, no real video API required) ─
// When no video provider is configured, builds a structured storyboard
// with a Pollinations still-frame placeholder. Provider-ready for MP4 later.
export interface VideoStoryboard {
  prompt: string;
  style: string;
  durationSec: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  frames: { ts: number; description: string; imagePrompt: string; imageUrl?: string }[];
  status: "storyboard_ready" | "queued" | "manual_upload";
  placeholderImageUrl?: string;
}

export async function generateVideoStoryboard(
  prompt: string,
  style = "cinematic",
  durationSec = 6,
  aspectRatio: "16:9" | "9:16" | "1:1" = "16:9"
): Promise<VideoStoryboard> {
  const frameCount = Math.max(2, Math.round(durationSec / 2));
  const frames = Array.from({ length: frameCount }, (_, i) => ({
    ts: Math.round((i / (frameCount - 1)) * durationSec * 1000),
    description: i === 0 ? `Opening — ${prompt}` : i === frameCount - 1 ? `Closing — ${prompt}` : `Mid shot ${i}`,
    imagePrompt: `${prompt}, ${style} style, frame ${i + 1} of ${frameCount}`,
  }));

  let placeholderImageUrl: string | undefined;
  try {
    placeholderImageUrl = await generateImage(`${prompt}, ${style}, key frame`, {
      width: aspectRatio === "9:16" ? 360 : 640,
      height: aspectRatio === "9:16" ? 640 : 360,
    });
  } catch { /* placeholder is optional */ }

  return { prompt, style, durationSec, aspectRatio, frames, status: "storyboard_ready", placeholderImageUrl };
}

export async function pingPollinations(): Promise<boolean> {
  try {
    const res = await fetch("https://text.pollinations.ai/models", { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch { return false; }
}
