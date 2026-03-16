import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Filter, RefreshCw, Search } from "lucide-react";
import API from "../services/api";
import AdminLayout from "../components/AdminLayout";

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

const typeMeta = {
  user_registered: { label: "User Registered", badge: "bg-cyan-300/10 text-cyan-100 border-cyan-300/20" },
  resume_uploaded: { label: "Resume Uploaded", badge: "bg-emerald-300/10 text-emerald-100 border-emerald-300/20" },
  ai_analysis_generated: { label: "AI Analysis", badge: "bg-indigo-300/10 text-indigo-100 border-indigo-300/20" },
  subscription_upgraded: { label: "Subscription", badge: "bg-amber-300/10 text-amber-100 border-amber-300/20" }
};

function getTypeLabel(type) {
  return typeMeta[type]?.label || String(type || "activity").replace(/_/g, " ");
}

function getTypeBadge(type) {
  return typeMeta[type]?.badge || "bg-white/5 text-slate-200 border-white/10";
}

function AdminActivity() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchActivity = async () => {
    try {
      setError("");
      const res = await API.get("/admin/activity", { params: { limit: 50 } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (fetchError) {
      console.error("Admin activity fetch error:", fetchError);
      setError(fetchError?.response?.data?.message || "Unable to load activity right now.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      fetchActivity();
    }, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const typeOptions = useMemo(() => {
    const unique = new Set(items.map((i) => i.type).filter(Boolean));
    const ordered = [
      "user_registered",
      "resume_uploaded",
      "ai_analysis_generated",
      "subscription_upgraded"
    ].filter((t) => unique.has(t));
    const remaining = [...unique].filter((t) => !ordered.includes(t)).sort();
    return ["all", ...ordered, ...remaining];
  }, [items]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        item.description,
        item.user?.name,
        item.user?.email,
        item.type
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, query, typeFilter]);

  return (
    <AdminLayout
      title="Activity Feed"
      subtitle="Track recent platform actions: registrations, resume uploads, AI analysis, and subscription upgrades."
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Recent Activity</p>
            <p className="text-sm text-slate-300">
              {loading ? "Loading..." : `${visibleItems.length} event${visibleItems.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/30 text-slate-200">
                <Filter size={16} />
              </span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-10 rounded-2xl border border-white/10 bg-slate-950/30 px-3 text-sm text-slate-100 outline-none"
              >
                {typeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "All types" : getTypeLabel(opt)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2.5 shadow-[0_10px_24px_rgba(2,6,23,0.35)]">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search activity…"
                className="w-64 max-w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>

            <button
              type="button"
              onClick={fetchActivity}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
                className="h-4 w-4 accent-cyan-300"
              />
              Auto refresh
            </label>
          </div>
        </div>

        {error ? (
          <div className="px-6 pt-5 text-sm text-rose-200">{error}</div>
        ) : null}

        <Motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.04 } }
          }}
          className="space-y-2 px-6 py-5"
        >
          {visibleItems.map((item) => (
            <Motion.div
              key={item._id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="group flex flex-col gap-2 rounded-3xl border border-white/10 bg-slate-950/25 p-4 shadow-[0_12px_30px_rgba(2,6,23,0.35)] transition hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getTypeBadge(item.type)}`}>
                    {getTypeLabel(item.type)}
                  </span>
                  <span className="truncate text-sm font-semibold text-white">{item.description}</span>
                </div>
                <p className="mt-2 truncate text-xs text-slate-400">
                  {item.user?.name ? `${item.user.name} • ` : ""}
                  {item.user?.email || "System"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <p className="text-xs font-semibold text-slate-400">{formatRelativeTime(item.createdAt)}</p>
                <p className="text-[11px] text-slate-500">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                </p>
              </div>
            </Motion.div>
          ))}

          {!loading && visibleItems.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/25 p-8 text-center text-sm text-slate-400">
              No activity found.
            </div>
          ) : null}
        </Motion.div>
      </section>
    </AdminLayout>
  );
}

export default AdminActivity;

