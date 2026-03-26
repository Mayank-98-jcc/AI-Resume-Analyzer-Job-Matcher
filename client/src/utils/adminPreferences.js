export const ADMIN_PREFERENCES_KEY = "adminPreferences";
export const ADMIN_PREFERENCES_EVENT = "admin-preferences-updated";

export const defaultAdminPreferences = {
  theme: "dark",
  motion: "expressive",
  refreshSeconds: 15,
  effects: "vivid"
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadAdminPreferences() {
  if (!canUseStorage()) return defaultAdminPreferences;

  try {
    const raw = window.localStorage.getItem(ADMIN_PREFERENCES_KEY);
    if (!raw) return defaultAdminPreferences;

    const parsed = JSON.parse(raw);
    return {
      ...defaultAdminPreferences,
      ...parsed
    };
  } catch {
    return defaultAdminPreferences;
  }
}

export function saveAdminPreferences(nextPreferences) {
  const normalized = {
    ...defaultAdminPreferences,
    ...nextPreferences
  };

  if (!canUseStorage()) return normalized;

  window.localStorage.setItem(ADMIN_PREFERENCES_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(ADMIN_PREFERENCES_EVENT, { detail: normalized }));
  return normalized;
}

export function applyAdminPreferences(preferences) {
  if (typeof document === "undefined") return;

  const normalized = {
    ...defaultAdminPreferences,
    ...preferences
  };

  document.documentElement.dataset.adminTheme = normalized.theme;
  document.documentElement.dataset.adminMotion = normalized.motion;
  document.documentElement.dataset.adminEffects = normalized.effects;
}
