const PREFIX = "agent-studio:";

export function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveData<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export const KEYS = {
  projects: "projects",
  memories: "memories",
  settings: "settings",
  training: "training",
  chatHistory: "chat-history"
};
