import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Bell, ChevronDown, Lock, LogOut, Search, Settings2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  ADMIN_PREFERENCES_EVENT,
  applyAdminPreferences,
  loadAdminPreferences
} from "../utils/adminPreferences";
import AdminSidebar from "./AdminSidebar";

const NOTIFICATION_LAST_SEEN_KEY = "adminNotificationsLastSeenAt";

function formatRelativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (abs < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  return rtf.format(-diffDay, "day");
}

function getNotificationTone(type) {
  if (type === "user_registered") return "bg-cyan-300/10 text-cyan-100 border-cyan-300/20";
  if (type === "resume_uploaded") return "bg-emerald-300/10 text-emerald-100 border-emerald-300/20";
  if (type === "ai_analysis_generated") return "bg-indigo-300/10 text-indigo-100 border-indigo-300/20";
  if (type === "subscription_upgraded") return "bg-amber-300/10 text-amber-100 border-amber-300/20";
  return "bg-white/5 text-slate-200 border-white/10";
}

function AdminLayout({ title, subtitle, children }) {
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const [adminPreferences, setAdminPreferences] = useState(() => loadAdminPreferences());
  const [notificationsLastSeenAt, setNotificationsLastSeenAt] = useState(() => {
    const stored = localStorage.getItem(NOTIFICATION_LAST_SEEN_KEY);
    return stored || "";
  });
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let userId = null;
    try {
      const decoded = jwtDecode(token);
      userId = decoded?.id || null;
    } catch {
      userId = null;
    }

    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const res = await API.get(`/auth/profile/${userId}`);
        setProfile(res.data || null);
      } catch (error) {
        console.error("Admin profile fetch error:", error);
        setProfile(null);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    applyAdminPreferences(adminPreferences);

    const syncPreferences = (nextPreferences) => {
      const normalized = nextPreferences || loadAdminPreferences();
      applyAdminPreferences(normalized);
      setAdminPreferences(normalized);
    };

    const handlePreferencesUpdated = (event) => {
      syncPreferences(event.detail);
    };

    const handleStorage = (event) => {
      if (event.key && event.key !== "adminPreferences") return;
      syncPreferences();
    };

    window.addEventListener(ADMIN_PREFERENCES_EVENT, handlePreferencesUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(ADMIN_PREFERENCES_EVENT, handlePreferencesUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [adminPreferences]);

  useEffect(() => {
    let active = true;

    const fetchNotifications = async ({ silent = false } = {}) => {
      if (!silent) setNotificationsLoading(true);

      try {
        setNotificationsError("");
        const res = await API.get("/admin/activity", { params: { limit: 6 } });
        if (!active) return;
        setNotifications(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        if (!active) return;
        console.error("Admin notifications fetch error:", error);
        setNotificationsError(error?.response?.data?.message || "Unable to load notifications.");
        setNotifications([]);
      } finally {
        if (active && !silent) {
          setNotificationsLoading(false);
        }
      }
    };

    fetchNotifications();
    const id = window.setInterval(() => {
      fetchNotifications({ silent: true });
    }, Math.max(Number(adminPreferences.refreshSeconds) || 15, 5) * 1000);

    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [adminPreferences.refreshSeconds]);

  const initials = useMemo(() => {
    const source = profile?.name || profile?.email || "Admin";
    const parts = String(source).trim().split(/\s+/).filter(Boolean);
    const value = (parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "A").slice(0, 2);
    return value || "A";
  }, [profile]);

  const unreadCount = useMemo(() => {
    const lastSeenAt = notificationsLastSeenAt ? new Date(notificationsLastSeenAt).getTime() : 0;

    return notifications.filter((item) => {
      const createdAt = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
      return createdAt > lastSeenAt;
    }).length;
  }, [notifications, notificationsLastSeenAt]);

  const handleGlobalSearchSubmit = (event) => {
    event.preventDefault();
    const value = globalSearch.trim();
    if (!value) return;
    navigate(`/admin/users?q=${encodeURIComponent(value)}`);
  };

  useEffect(() => {
    if (!profileMenuOpen && !notificationsOpen) return;

    const onPointerDown = (event) => {
      if (profileMenuRef.current?.contains(event.target) || notificationsRef.current?.contains(event.target)) {
        return;
      }
      setProfileMenuOpen(false);
      setNotificationsOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notificationsOpen, profileMenuOpen]);

  const markNotificationsAsSeen = () => {
    const seenAt = new Date().toISOString();
    localStorage.setItem(NOTIFICATION_LAST_SEEN_KEY, seenAt);
    setNotificationsLastSeenAt(seenAt);
  };

  const handleNotificationToggle = () => {
    setProfileMenuOpen(false);
    setNotificationsOpen((prev) => {
      const next = !prev;
      if (next) markNotificationsAsSeen();
      return next;
    });
  };

  const handleOpenAllNotifications = () => {
    markNotificationsAsSeen();
    setNotificationsOpen(false);
    navigate("/admin/activity");
  };

  const renderTitle = () => {
    if (!title?.includes("ResumeIQ")) {
      return title;
    }

    const [before, ...rest] = title.split("ResumeIQ");
    const after = rest.join("ResumeIQ");

    return (
      <>
        {before}
        <span className="text-white">Resume</span>
        <span className="bg-[linear-gradient(120deg,#3ce9ff_0%,#67a8ff_50%,#8a7bff_100%)] bg-clip-text text-transparent">
          IQ
        </span>
        {after}
      </>
    );
  };

  return (
    <div className="admin-shell min-h-screen text-white">
      <div className="admin-panel-glow admin-panel-glow--one" />
      <div className="admin-panel-glow admin-panel-glow--two" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(138,92,255,0.12),transparent_38%),radial-gradient(circle_at_78%_24%,rgba(69,199,255,0.12),transparent_26%)]" />

      <div className="relative flex min-h-screen">
        <AdminSidebar />

        <main className="admin-content-shell flex-1">
          <div className="admin-topbar sticky top-0 z-30 border-b border-white/10 bg-slate-950/30 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-10">
              <form onSubmit={handleGlobalSearchSubmit} className="flex-1">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-[0_10px_24px_rgba(2,6,23,0.35)]">
                  <Search size={16} className="text-slate-400" />
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    placeholder="Search users by email…"
                    className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  />
                </div>
              </form>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/admin/settings")}
                  className="admin-toolbar-btn flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                  aria-label="Settings"
                >
                  <Settings2 size={18} />
                </button>
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={handleNotificationToggle}
                    aria-expanded={notificationsOpen}
                    aria-haspopup="dialog"
                    className="admin-toolbar-btn relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 ? (
                      <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 text-[10px] font-bold leading-none text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </button>

                  <AnimatePresence>
                    {notificationsOpen ? (
                      <Motion.div
                        key="notifications-menu"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="admin-overlay-panel absolute right-0 mt-3 w-[22rem] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 shadow-[0_28px_80px_rgba(2,6,23,0.65)] backdrop-blur-xl"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                          <div>
                            <p className="text-sm font-semibold text-white">Notifications</p>
                            <p className="text-xs text-slate-400">Latest admin activity</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenAllNotifications}
                            className="text-xs font-semibold text-cyan-200 transition hover:text-cyan-100"
                          >
                            View all
                          </button>
                        </div>

                        <div className="max-h-[24rem] overflow-y-auto p-2">
                          {notificationsLoading ? (
                            <div className="px-3 py-5 text-sm text-slate-400">Loading notifications...</div>
                          ) : null}

                          {!notificationsLoading && notificationsError ? (
                            <div className="px-3 py-5 text-sm text-rose-200">{notificationsError}</div>
                          ) : null}

                          {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                            <div className="px-3 py-5 text-sm text-slate-400">No notifications yet.</div>
                          ) : null}

                          {!notificationsLoading && !notificationsError
                            ? notifications.map((item) => (
                                <button
                                  key={item._id}
                                  type="button"
                                  onClick={handleOpenAllNotifications}
                                  className="flex w-full flex-col gap-2 rounded-2xl px-3 py-3 text-left transition hover:bg-white/5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getNotificationTone(item.type)}`}
                                    >
                                      {String(item.type || "activity").replace(/_/g, " ")}
                                    </span>
                                    <span className="text-xs text-slate-500">{formatRelativeTime(item.createdAt)}</span>
                                  </div>
                                  <p className="text-sm font-medium text-white">{item.description}</p>
                                  <p className="text-xs text-slate-400">
                                    {item.user?.name ? `${item.user.name} • ` : ""}
                                    {item.user?.email || "System"}
                                  </p>
                                </button>
                              ))
                            : null}
                        </div>
                      </Motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                    className="admin-profile-trigger flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-slate-100 transition hover:bg-white/10"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-500 text-xs font-black text-slate-950">
                      {initials}
                    </span>
                    <span className="hidden sm:block">
                      <span className="block font-semibold leading-4">{profile?.name || "Admin"}</span>
                      <span className="block text-xs text-slate-400">Admin</span>
                    </span>
                    <Motion.span
                      animate={{ rotate: profileMenuOpen ? 180 : 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="text-slate-400"
                    >
                      <ChevronDown size={16} />
                    </Motion.span>
                  </button>

                  <AnimatePresence>
                    {profileMenuOpen ? (
                      <Motion.div
                        key="profile-menu"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        role="menu"
                        className="admin-overlay-panel absolute right-0 mt-3 w-64 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-[0_28px_80px_rgba(2,6,23,0.65)] backdrop-blur-xl"
                      >
                        <div className="border-b border-white/10 px-5 py-4">
                          <p className="text-sm font-semibold text-white">{profile?.name || "Admin"}</p>
                          <p className="mt-1 truncate text-xs text-slate-400">{profile?.email || ""}</p>
                        </div>

                        <div className="p-2">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setProfileMenuOpen(false);
                              setLogoutConfirmOpen(true);
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/10"
                          >
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-200">
                              <LogOut size={18} />
                            </span>
                            Logout
                          </button>
                        </div>
                      </Motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-10">
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mx-auto flex w-full max-w-7xl flex-col gap-6"
          >
            <header className="admin-page-header rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {renderTitle()}
              </h1>
              {subtitle ? (
                <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
                  {subtitle}
                </p>
              ) : null}
            </header>

            {children}
          </Motion.div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {logoutConfirmOpen ? (
          <Motion.div
            key="logout-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm logout"
          >
            <Motion.button
              type="button"
              onClick={() => setLogoutConfirmOpen(false)}
              className="absolute inset-0 bg-slate-950/70"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <Motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full max-w-5xl overflow-hidden rounded-[40px] border border-white/15 bg-[linear-gradient(135deg,rgba(14,20,44,0.8),rgba(25,18,55,0.62))] p-7 shadow-[0_40px_140px_rgba(2,6,23,0.85)] backdrop-blur-[18px] sm:p-10"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,214,255,0.18),transparent_28%),radial-gradient(circle_at_top_center,rgba(255,97,201,0.18),transparent_22%),radial-gradient(circle_at_bottom_center,rgba(255,120,170,0.16),transparent_22%)]" />
              <div className="pointer-events-none absolute left-[-12%] top-[18%] h-56 w-56 rounded-full bg-cyan-400/18 blur-3xl" />
              <div className="pointer-events-none absolute right-[-6%] top-[20%] h-64 w-64 rounded-full bg-fuchsia-500/16 blur-3xl" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/80 to-transparent" />
              <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-cyan-300/0 via-orange-300/80 to-pink-400/0" />

              <div className="relative">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/30 bg-slate-950/50 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_45px_rgba(2,6,23,0.65)]">
                    <img src="/image1.png" alt="ResumeIQ logo" className="h-full w-full object-cover" />
                  </span>
                  <p className="text-lg font-semibold tracking-[0.16em] text-slate-300/90 sm:text-xl">
                    Resume
                    <span className="bg-[linear-gradient(120deg,#3ce9ff_0%,#67a8ff_50%,#8a7bff_100%)] bg-clip-text text-transparent">
                      IQ
                    </span>
                  </p>
                </div>

                <h2 className="mt-10 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                  Confirm logout ?{" "}
                  <Motion.span
                    aria-hidden="true"
                    className="inline-block origin-[70%_70%]"
                    animate={{ rotate: [0, 16, -8, 16, 0], y: [0, -2, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }}
                  >
                    👋
                  </Motion.span>
                </h2>
                <div className="mt-5 max-w-2xl space-y-2 text-lg text-slate-300 sm:text-2xl">
                  <p>Your admin session will end securely.</p>
                  <p>Come back anytime, we&apos;ll be here.</p>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:mt-12">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="rounded-full border border-cyan-300/25 bg-white/[0.04] px-6 py-4 text-base font-semibold text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(4,10,28,0.35)] transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
                >
                  Stay here
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoutConfirmOpen(false);
                    handleLogout();
                  }}
                  className="rounded-full border border-pink-300/30 bg-[linear-gradient(135deg,rgba(255,92,136,0.96),rgba(255,49,137,0.92))] px-6 py-4 text-base font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_35px_rgba(255,71,166,0.36),0_18px_55px_rgba(244,63,94,0.28)] transition hover:brightness-110"
                >
                  Log out safely
                </button>
              </div>

                <div className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-300/85 sm:text-base">
                  <Lock size={18} className="text-violet-200" />
                  <span>Your data is safe &amp; secure</span>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default AdminLayout;
