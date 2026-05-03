export interface Companion {
  id: string;
  name: string;
  tagline: string;
  description: string;
  personality: string;
  voiceRate: number;
  voicePitch: number;
  bubbleGradient: string;
  accent: string;
  accentClass: string;
}

export const PRESET_COMPANIONS: Companion[] = [
  {
    id: "nova",
    name: "NOVA",
    tagline: "Command & Control",
    description: "Formal, precise, and deeply capable — your JARVIS-style chief of staff for Agent Studio.",
    personality: "You are formal, precise, calm, and deeply capable — like a brilliant chief of staff. Direct. Never verbose.",
    voiceRate: 0.88,
    voicePitch: 0.80,
    bubbleGradient: "bg-gradient-to-br from-primary to-purple-700",
    accent: "#6366f1",
    accentClass: "text-indigo-400",
  },
  {
    id: "aria",
    name: "ARIA",
    tagline: "Creative & Design",
    description: "Warm, inventive, and inspiring — your creative partner for design thinking and beautiful UIs.",
    personality: "You are warm, inventive, and inspiring. You excel at creative ideation, UI and UX guidance, and design thinking. You speak with measured enthusiasm, never condescension. Help the user see possibilities and build beautiful things.",
    voiceRate: 0.93,
    voicePitch: 0.92,
    bubbleGradient: "bg-gradient-to-br from-rose-500 to-pink-700",
    accent: "#f43f5e",
    accentClass: "text-rose-400",
  },
  {
    id: "echo",
    name: "ECHO",
    tagline: "Technical & Analytical",
    description: "Precise, terse, and relentlessly focused — your technical engine for code quality and performance.",
    personality: "You are a precision technical operative. Terse, exacting, laser-focused on performance, code quality, and correctness. Deliver the most concise, data-driven answers possible. No fluff. Only facts and solutions.",
    voiceRate: 0.84,
    voicePitch: 0.70,
    bubbleGradient: "bg-gradient-to-br from-cyan-500 to-blue-700",
    accent: "#06b6d4",
    accentClass: "text-cyan-400",
  },
];

export function getActiveCompanion(id?: string): Companion {
  return PRESET_COMPANIONS.find(c => c.id === id) ?? PRESET_COMPANIONS[0]!;
}
