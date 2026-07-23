export type StoredChat = {
  id: string;
  title: string;
  /** Shell persona: overview | engineer | finance | operations | maintenance | safety */
  mode: string;
  role: string;
  updatedAt: number;
  /** True after this chat's first ask landed canvas charts. */
  firstAskDone?: boolean;
};

const KEY = "plantos.chat.sessions.v2";
const KEY_LEGACY = "plantos.chat.sessions.v1";
const ACTIVE_KEY = "plantos.chat.activeByMode.v1";

function normalizeMode(mode: unknown): string {
  return String(mode || "")
    .trim()
    .toLowerCase();
}

export function loadChatSessions(): StoredChat[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      raw = localStorage.getItem(KEY_LEGACY);
      if (raw) {
        const migrated = migrateSessions(JSON.parse(raw));
        saveChatSessions(migrated);
        return migrated;
      }
      return [];
    }
    const parsed = JSON.parse(raw) as StoredChat[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => ({
        ...s,
        mode: normalizeMode(s.mode),
        role: String(s.role || ""),
      }))
      .filter((s) => Boolean(s.id && s.mode))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function migrateSessions(raw: unknown): StoredChat[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s: any) => ({
      id: String(s?.id || ""),
      title: String(s?.title || "Chat"),
      mode: normalizeMode(s?.mode),
      role: String(s?.role || ""),
      updatedAt: Number(s?.updatedAt) || Date.now(),
      firstAskDone: Boolean(s?.firstAskDone),
    }))
    .filter((s) => s.id && s.mode);
}

/** Only chats belonging to this persona (case-insensitive mode). */
export function sessionsForMode(mode: string): StoredChat[] {
  const m = normalizeMode(mode);
  return loadChatSessions().filter((s) => s.mode === m);
}

export function saveChatSessions(sessions: StoredChat[]) {
  if (typeof window === "undefined") return;
  const normalized = sessions.map((s) => ({
    ...s,
    mode: normalizeMode(s.mode),
  }));
  localStorage.setItem(KEY, JSON.stringify(normalized.slice(0, 80)));
}

export function upsertChatSession(session: StoredChat) {
  const next: StoredChat = {
    ...session,
    mode: normalizeMode(session.mode),
    updatedAt: session.updatedAt || Date.now(),
  };
  const all = loadChatSessions().filter((s) => s.id !== next.id);
  all.unshift(next);
  saveChatSessions(all);
  setActiveChatId(next.mode, next.id);
  return all;
}

export function markChatFirstAskDone(chatId: string, done = true) {
  const all = loadChatSessions();
  const idx = all.findIndex((s) => s.id === chatId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], firstAskDone: done };
  saveChatSessions(all);
}

export function getChatFirstAskDone(chatId: string): boolean {
  return Boolean(loadChatSessions().find((s) => s.id === chatId)?.firstAskDone);
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
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      out[normalizeMode(k)] = String(v);
    }
    return out;
  } catch {
    return {};
  }
}

export function setActiveChatId(mode: string, id: string) {
  if (typeof window === "undefined") return;
  const next = { ...loadActiveChatIds(), [normalizeMode(mode)]: id };
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(next));
}

export function getActiveChatId(mode: string): string | null {
  return loadActiveChatIds()[normalizeMode(mode)] ?? null;
}

export function newChatId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Resolve which chat to open for a persona: last active if still present, else newest, else new id. */
export function resolveChatIdForMode(mode: string): { chatId: string; sessions: StoredChat[] } {
  const m = normalizeMode(mode);
  const sessions = sessionsForMode(m);
  const active = getActiveChatId(m);
  if (active && sessions.some((s) => s.id === active)) {
    return { chatId: active, sessions };
  }
  if (sessions[0]) {
    setActiveChatId(m, sessions[0].id);
    return { chatId: sessions[0].id, sessions };
  }
  const chatId = newChatId();
  return { chatId, sessions };
}
