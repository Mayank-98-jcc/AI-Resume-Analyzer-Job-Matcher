import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  BriefcaseBusiness,
  Crown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  History,
  Home,
  Lock,
  LogOut,
  ScrollText,
  Upload
} from "lucide-react";
import API from "../services/api";
import SupportPanel from "./SupportPanel";

const navItems = [
  { key: "home", label: "Dashboard", icon: Home, path: "/dashboard" },
  { key: "upload", label: "Upload Resume", icon: Upload, path: "/dashboard" },
  { key: "summary", label: "AI Resume Summary", icon: ScrollText, path: "/dashboard" },
  { key: "jobMatch", label: "Job Matcher", icon: BriefcaseBusiness, path: "/job-match" },
  { key: "billing", label: "Billing", icon: Crown, path: "/billing" },
  { key: "history", label: "Resume History", icon: History, path: "/history", offsetTop: true }
];
const mobileNavItems = navItems;

function DashboardSidebar({ activeItem, navigate, onLogout, userId }) {
  const [profile, setProfile] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setProfile(null);
        return;
      }

      try {
        const res = await API.get(`/auth/profile/${userId}`);
        setProfile(res.data || null);
      } catch (error) {
        console.error("Profile fetch error:", error);
        setProfile(null);
      }
    };

    fetchProfile();
  }, [userId]);

  const initials = useMemo(() => {
    const fallback = "U";
    const source = profile?.name || profile?.email || "";
    const parts = source.trim().split(/\s+/).filter(Boolean);

    if (!parts.length) return fallback;

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || fallback;
  }, [profile]);

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

  const handleNavigation = (item) => {
    if (item.key === "upload") {
      navigate("/dashboard");
      window.requestAnimationFrame(() => {
        document.getElementById("dashboard-upload-section")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      });
      return;
    }

    if (item.key === "summary") {
      navigate("/dashboard");
      window.requestAnimationFrame(() => {
        document.getElementById("dashboard-summary-section")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      });
      return;
    }

    navigate(item.path);
  };

  return (
    <>
      <aside
        className={`relative z-20 hidden min-h-screen flex-col border-r border-cyan-400/10 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950/95 px-3 py-4 text-white shadow-[0_0_40px_rgba(2,132,199,0.08)] transition-all duration-300 lg:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_30%)]" />

        <div className="relative flex h-full flex-col">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between gap-3"}`}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-cyan-400/15 bg-white/5 px-3 py-2.5 backdrop-blur-sm transition-all duration-300 hover:border-cyan-300/30 hover:bg-white/10"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950/80 shadow-lg shadow-cyan-950/40">
                <img src="/image1.png" alt="ResumeIQ logo" className="h-full w-full object-cover" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-wide text-slate-100">
                  Resume<span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">IQ</span>
                </p>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-cyan-300/35 bg-slate-900/60 text-slate-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-all duration-300 hover:border-cyan-300/60 hover:bg-cyan-400/10 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
        </div>

        <div ref={profileMenuRef} className="relative mt-5">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
            <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-500 text-sm font-black text-slate-950 shadow-lg shadow-blue-950/40">
                {initials}
              </div>

              <div
                className={`min-w-0 transition-all duration-300 ${
                  collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
                }`}
              >
                <p className="truncate text-sm font-semibold text-slate-100">
                  {profile?.name || "Your Profile"}
                </p>
              </div>

              {!collapsed && (
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/25 text-cyan-200/80 transition hover:bg-white/10 hover:text-cyan-100"
                >
                  <Motion.span
                    animate={{ rotate: profileMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <ChevronDown size={18} />
                  </Motion.span>
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {profileMenuOpen && !collapsed ? (
              <Motion.div
                key="user-profile-menu"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                role="menu"
                className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-[0_28px_80px_rgba(2,6,23,0.65)] backdrop-blur-xl"
              >
                <div className="border-b border-white/10 px-5 py-4">
                  <p className="text-sm font-semibold text-white">{profile?.name || "User"}</p>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setShowLogoutConfirm(true);
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

        <div className="mt-6">
          {!collapsed && (
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Workspace
            </p>
          )}

          <nav className="mt-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigation(item)}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={`group relative flex w-full transform-gpu items-center rounded-2xl px-3 py-3 text-sm transition-all duration-200 hover:scale-[1.05] hover:bg-blue-500/10 ${
                    item.offsetTop ? "mt-4" : ""
                  } ${
                    collapsed ? "justify-center" : "gap-3"
                  } ${
                    isActive
                      ? "bg-cyan-400/12 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.18)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                      isActive
                        ? "bg-cyan-400/14 text-cyan-200"
                        : "bg-slate-900/40 text-slate-400 group-hover:bg-cyan-400/10 group-hover:text-cyan-200"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                  </span>

                  <span
                    className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ${
                      collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
                    }`}
                  >
                    <span className="block font-medium">{item.label}</span>
                    {!collapsed && isActive && (
                      <span className="block text-xs text-cyan-200/75">
                        Current page
                      </span>
                    )}
                  </span>

                  {collapsed ? (
                    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 translate-x-[-14px] scale-90 whitespace-nowrap rounded-3xl border border-cyan-200/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.92)_0%,rgba(15,23,42,0.88)_45%,rgba(2,6,23,0.92)_100%)] px-4 py-2.5 text-sm font-semibold tracking-wide text-white opacity-0 shadow-[0_22px_70px_rgba(2,6,23,0.75)] ring-1 ring-cyan-300/10 backdrop-blur-xl transition-all duration-250 ease-out group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100">
                      <span className="absolute -left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 bg-[linear-gradient(135deg,rgba(2,6,23,0.92)_0%,rgba(15,23,42,0.88)_45%,rgba(2,6,23,0.92)_100%)] ring-1 ring-cyan-300/10" />
                      {item.label}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto pt-6">
          {!collapsed && (
            <div className="mb-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">
                Tip
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Upload your latest resume to refresh ATS insights and suggestions.
              </p>
            </div>
          )}
        </div>
        </div>

        <AnimatePresence>
          {showLogoutConfirm ? (
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
                onClick={() => setShowLogoutConfirm(false)}
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
                    <p>Your session will end securely.</p>
                    <p>Come back anytime, we&apos;ll be here.</p>
                  </div>

                  <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="rounded-full border border-cyan-300/25 bg-white/[0.04] px-6 py-4 text-base font-semibold text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_12px_30px_rgba(4,10,28,0.35)] transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
                    >
                      Stay here
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoutConfirm(false);
                        onLogout();
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
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-300/10 bg-[linear-gradient(180deg,rgba(8,14,34,0.92),rgba(7,11,28,0.98))] px-3 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_45px_rgba(2,8,23,0.42)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto pb-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigation(item)}
                className={`flex min-w-[78px] flex-1 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-center transition ${
                  isActive
                    ? "bg-cyan-400/12 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.16)]"
                    : "text-slate-300"
                }`}
                aria-label={item.label}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isActive ? "bg-cyan-400/14 text-cyan-200" : "bg-white/[0.04] text-slate-400"
                  }`}
                >
                  <Icon size={17} strokeWidth={2.2} />
                </span>
                <span className="text-[11px] font-medium leading-tight">
                  {item.key === "jobMatch" ? "Matcher" : item.label.replace("Resume ", "")}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex min-w-[78px] flex-1 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-center text-slate-300 transition"
            aria-label="Logout"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-slate-300">
              <LogOut size={17} strokeWidth={2.2} />
            </span>
            <span className="text-[11px] font-medium leading-tight">Logout</span>
          </button>
        </div>
      </div>
      <SupportPanel />
    </>
  );
}

export default DashboardSidebar;
