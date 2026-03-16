import { useMemo, useState } from "react";
import { Activity, BarChart3, ChevronLeft, ChevronRight, FileSearch, Search, Sparkles, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3, path: "/admin", exact: true },
  { key: "users", label: "Users", icon: Users, path: "/admin/users" },
  { key: "resumes", label: "Resumes", icon: FileSearch, path: "/admin/resumes" },
  { key: "activity", label: "Activity", icon: Activity, path: "/admin/activity" },
  { key: "candidates", label: "Search Candidates", icon: Search, path: "/admin/candidates" },
  { key: "aiMatching", label: "AI Candidate Matching", icon: Sparkles, path: "/admin/ai-matching" },
];

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const activeKey = useMemo(() => {
    const pathname = location.pathname || "";

    const directMatch = navItems.find((item) => item.exact && item.path === pathname);
    if (directMatch) return directMatch.key;

    const prefixMatch = navItems.find((item) => !item.exact && pathname.startsWith(item.path));
    return prefixMatch?.key || "dashboard";
  }, [location.pathname]);

  return (
    <aside
      className={`hidden min-h-screen shrink-0 border-r border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#111827_42%,#1e293b_100%)] py-6 text-white transition-all duration-300 lg:flex ${
        collapsed ? "w-20 px-3" : "w-72 px-5"
      }`}
    >
      <div className="flex w-full flex-col">
        <div
          className={`flex ${
            collapsed ? "flex-col items-center gap-3" : "items-center justify-between gap-3"
          }`}
        >
          {!collapsed ? (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="flex min-w-0 items-center gap-3 overflow-hidden rounded-3xl border border-cyan-400/15 bg-white/5 px-4 py-4 text-left shadow-lg shadow-cyan-950/20 transition hover:bg-white/10"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 shadow-lg shadow-cyan-950/30">
                <img src="/image1.png" alt="ResumeIQ logo" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-wide text-slate-100">
                  Resume
                  <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">IQ</span>
                </p>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Admin Panel</p>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-cyan-400/20 bg-white/5 shadow-lg shadow-cyan-950/20 transition hover:bg-white/10"
              aria-label="Go to admin dashboard"
            >
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 shadow-lg shadow-cyan-950/30">
                <img src="/image1.png" alt="ResumeIQ logo" className="h-full w-full object-cover" />
              </span>
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

        <div className="mt-8">
          {!collapsed && (
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Platform
            </p>
          )}
          <nav className="mt-3 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeKey === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={`group relative flex w-full items-center rounded-2xl py-3 text-sm font-medium transition ${
                    collapsed ? "justify-center" : "gap-3"
                  } ${
                    collapsed ? "px-2" : "px-4"
                  } ${
                    isActive
                      ? "bg-cyan-400/15 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]"
                      : "text-slate-300 hover:bg-cyan-400/10 hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(103,232,249,0.14)]"
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? "bg-cyan-300/15 text-cyan-200" : "bg-slate-800/80 text-slate-400"}`}>
                    <Icon size={18} />
                  </span>
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                      collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
                    }`}
                  >
                    {item.label}
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

        <div className="mt-auto">
          {!collapsed && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin tools</p>
              <p className="mt-2 text-sm text-slate-300">
                Monitor user growth, resume activity, and subscription mix from one place.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
