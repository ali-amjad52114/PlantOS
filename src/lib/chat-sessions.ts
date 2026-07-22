export type StoredChat = {
  id: string;
  title: string;
  mode: string;
  role: string;
  updatedAt: number;
};

const KEY = "plantos.chat.sessions.v1";
const ACTIVE_KEY = "plantos.chat.activeByMode.v1";

export function loadChatSessions(): StoredChat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChat[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function sessionsForMode(mode: string): StoredChat[] {
  return loadChatSessions().filter((s) => s.mode === mode);
}

export function saveChatSessions(sessions: StoredChat[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 60)));
}

export function upsertChatSession(session: StoredChat) {
  const all = loadChatSessions().filter((s) => s.id !== session.id);
  all.unshift(session);
  saveChatSessions(all);
  setActiveChatId(session.mode, session.id);
  return all;
}

export function removeChatSession(id: string) {
  const all = loadChatSessions().filter((s) => s.id !== id);
  saveChatSessions(all);
  return all;
}

export function loadActiveChatIds(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function setActiveChatId(mode: string, id: string) {
  if (typeof window === "undefined") return;
  const next = { ...loadActiveChatIds(), [mode]: id };
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(next));
}

export function getActiveChatId(mode: string): string | null {
  return loadActiveChatIds()[mode] ?? null;
}

export function newChatId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Resolve which chat to open for a persona: last active if still present, else newest, else new id. */
export function resolveChatIdForMode(mode: string): { chatId: string; sessions: StoredChat[] } {
  const sessions = sessionsForMode(mode);
  const active = getActiveChatId(mode);
  if (active && sessions.some((s) => s.id === active)) {
    return { chatId: active, sessions };
  }
  if (sessions[0]) {
    setActiveChatId(mode, sessions[0].id);
    return { chatId: sessions[0].id, sessions };
  }
  const chatId = newChatId();
  return { chatId, sessions };
}
