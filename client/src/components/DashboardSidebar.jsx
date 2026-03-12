import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  History,
  Home,
  LogOut,
  ScrollText,
  Upload,
  UserCircle2
} from "lucide-react";
import API from "../services/api";

const navItems = [
  { key: "home", label: "Dashboard", icon: Home, path: "/dashboard" },
  { key: "upload", label: "Upload Resume", icon: Upload, path: "/dashboard" },
  { key: "summary", label: "AI Resume Summary", icon: ScrollText, path: "/dashboard" },
  { key: "jobMatch", label: "Job Matcher", icon: BriefcaseBusiness, path: "/job-match" },
  { key: "history", label: "Resume History", icon: History, path: "/history", offsetTop: true }
];

function DashboardSidebar({ activeItem, navigate, onLogout, userId }) {
  const [profile, setProfile] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
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
              <p className="truncate text-xs text-slate-400">
                {profile?.email || (
                  <>
                    Signed in to Resume<span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">IQ</span>
                  </>
                )}
              </p>
            </div>

            {!collapsed && (
              <UserCircle2 size={18} className="ml-auto shrink-0 text-cyan-300/80" />
            )}
          </div>
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
                  className={`group flex w-full transform-gpu items-center rounded-2xl px-3 py-3 text-sm transition-all duration-200 hover:scale-[1.05] hover:bg-blue-500/10 ${
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

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className={`group flex w-full items-center rounded-2xl border border-rose-400/10 bg-rose-400/[0.04] px-3 py-3 text-sm font-medium text-rose-200 transition-all duration-300 hover:border-rose-300/25 hover:bg-rose-400/10 ${
              collapsed ? "justify-center" : "gap-3"
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300">
              <LogOut size={18} strokeWidth={2.2} />
            </span>
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl">
            <p className="text-base font-semibold text-white">
              Log out of Resume<span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">IQ</span>?
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure that you want to log out?
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all duration-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 rounded-2xl border border-rose-400/20 bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-200 transition-all duration-300 hover:bg-rose-500/25"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default DashboardSidebar;
