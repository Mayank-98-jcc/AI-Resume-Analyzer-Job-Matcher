import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Bell, ChevronDown, Lock, LogOut, Search, Settings2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import AdminSidebar from "./AdminSidebar";

function AdminLayout({ title, subtitle, children }) {
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const profileMenuRef = useRef(null);

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

  const initials = useMemo(() => {
    const source = profile?.name || profile?.email || "Admin";
    const parts = String(source).trim().split(/\s+/).filter(Boolean);
    const value = (parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "A").slice(0, 2);
    return value || "A";
  }, [profile]);

  const handleGlobalSearchSubmit = (event) => {
    event.preventDefault();
    const value = globalSearch.trim();
    if (!value) return;
    navigate(`/admin/users?q=${encodeURIComponent(value)}`);
  };

  useEffect(() => {
    if (!profileMenuOpen) return;

    const onPointerDown = (event) => {
      if (!profileMenuRef.current) return;
      if (profileMenuRef.current.contains(event.target)) return;
      setProfileMenuOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileMenuOpen]);

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

        <main className="flex-1">
          <div className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/30 backdrop-blur-xl">
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
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                  aria-label="Settings"
                >
                  <Settings2 size={18} />
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                </button>

                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-slate-100 transition hover:bg-white/10"
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
                        className="absolute right-0 mt-3 w-64 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-[0_28px_80px_rgba(2,6,23,0.65)] backdrop-blur-xl"
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
            <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl">
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
