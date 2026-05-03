interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function callAI(
  messages: Message[],
  settings?: { groqKey?: string },
  onChunk?: (fullText: string) => void
): Promise<string> {
  const useGroq = !!(settings?.groqKey && settings.groqKey.trim().length > 20);
  if (useGroq) {
    try {
      return await callGroqStream(messages, settings!.groqKey!, onChunk);
    } catch {
      // fall through to free providers
    }
  }
  try {
    return await callPollinationsStream(messages, onChunk);
  } catch {
    return localFallback(messages, onChunk);
  }
}

async function callPollinationsStream(
  messages: Message[],
  onChunk?: (fullText: string) => void
): Promise<string> {
  const res = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai-fast", messages, temperature: 0.4, private: true, stream: !!onChunk }),
  });
  if (!res.ok) throw new Error(`Pollinations error: ${res.status}`);
  if (onChunk && res.body) return readStream(res.body, onChunk);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callGroqStream(
  messages: Message[], apiKey: string, onChunk?: (fullText: string) => void
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, temperature: 0.4, stream: !!onChunk }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}`);
  if (onChunk && res.body) return readStream(res.body, onChunk);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

async function readStream(body: ReadableStream<Uint8Array>, onChunk: (full: string) => void): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
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
          if (delta) { fullText += delta; onChunk(fullText); }
        } catch { /* skip */ }
      }
    }
  } finally { reader.releaseLock(); }
  return fullText;
}

export async function pingPollinations(): Promise<boolean> {
  try {
    const res = await fetch("https://text.pollinations.ai/models", { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch { return false; }
}

function localFallback(messages: Message[], onChunk?: (fullText: string) => void): string {
  const last = messages.slice().reverse().find(m => m.role === "user")?.content ?? "";
  const reply = [
    "I’m in fallback mode.",
    "I can still help with summaries and app guidance.",
    last ? `I received: ${last.slice(0, 240)}` : "",
  ].filter(Boolean).join("\n");
  onChunk?.(reply);
  return reply;
}
