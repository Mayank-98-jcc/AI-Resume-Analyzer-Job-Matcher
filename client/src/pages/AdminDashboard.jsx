import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  BadgeIndianRupee,
  Crown,
  FileSearch,
  FileText,
  MessageSquareMore,
  Search,
  Sparkles,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import AdminLayout from "../components/AdminLayout";

const statCards = [
  { key: "totalUsers", label: "Total Users", icon: Users, accent: "from-cyan-400 to-sky-500" },
  { key: "totalResumes", label: "Total Resumes Uploaded", icon: FileText, accent: "from-emerald-400 to-teal-500" },
  { key: "freeUsers", label: "Free Users", icon: BadgeIndianRupee, accent: "from-slate-400 to-slate-500" },
  { key: "proUsers", label: "Pro Users", icon: Crown, accent: "from-amber-400 to-orange-500" },
  { key: "premiumUsers", label: "Premium Users", icon: Crown, accent: "from-fuchsia-400 to-rose-500" }
];

function formatCompact(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "-";
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
  return String(number);
}

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-xl bg-white/10 ${className || ""}`} />;
}

function formatIsoDayLabel(isoDay) {
  if (!isoDay) return "";
  const date = new Date(`${isoDay}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(date);
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-xs text-slate-200 shadow-[0_18px_55px_rgba(2,6,23,0.65)] backdrop-blur-xl">
      <p className="text-slate-400">{formatIsoDayLabel(label)}</p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-6">
            <span className="text-slate-300">{item.name || item.dataKey}</span>
            <span className="font-semibold text-white">{formatCompact(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalResumes: 0,
    freeUsers: 0,
    proUsers: 0,
    premiumUsers: 0
  });
  const [users, setUsers] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    resumeUploads: [],
    plans: { free: 0, pro: 0, premium: 0 }
  });
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAdminOverview = async () => {
      try {
        setLoading(true);
        setError("");
        const [statsRes, usersRes, resumesRes, analyticsRes, feedbackRes] = await Promise.all([
          API.get("/admin/stats"),
          API.get("/admin/users"),
          API.get("/admin/resumes"),
          API.get("/admin/analytics"),
          API.get("/admin/feedback", { params: { limit: 8 } })
        ]);
        setStats(statsRes.data || {});
        setUsers(Array.isArray(usersRes.data?.data) ? usersRes.data.data : []);
        setResumes(Array.isArray(resumesRes.data?.data) ? resumesRes.data.data : []);
        setAnalytics(
          analyticsRes.data || { userGrowth: [], resumeUploads: [], plans: { free: 0, pro: 0, premium: 0 } }
        );
        setFeedback(Array.isArray(feedbackRes.data?.data) ? feedbackRes.data.data : []);

        if ((feedbackRes.data?.meta?.unreadCount || 0) > 0) {
          API.patch("/admin/feedback/read").catch((markError) => {
            console.error("Admin feedback mark read error:", markError);
          });
        }
      } catch (fetchError) {
        console.error("Admin dashboard fetch error:", fetchError);
        setError(fetchError?.response?.data?.message || "Unable to load admin dashboard right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminOverview();
  }, []);

  const deltas = useMemo(
    () => ({
      totalUsers: null,
      totalResumes: null,
      freeUsers: null,
      proUsers: null,
      premiumUsers: null
    }),
    []
  );

  const planPalette = useMemo(
    () => ({
      free: "#38bdf8",
      pro: "#a78bfa",
      premium: "#34d399"
    }),
    []
  );

  const planData = useMemo(() => {
    const plans = analytics?.plans || {};
    return [
      { key: "free", name: "Free", value: Number(plans.free ?? stats.freeUsers ?? 0) },
      { key: "pro", name: "Pro", value: Number(plans.pro ?? stats.proUsers ?? 0) },
      { key: "premium", name: "Premium", value: Number(plans.premium ?? stats.premiumUsers ?? 0) }
    ];
  }, [analytics?.plans, stats.freeUsers, stats.premiumUsers, stats.proUsers]);

  const chartPlanData = useMemo(() => {
    const activePlans = planData.filter((item) => item.value > 0);
    return activePlans.length ? activePlans : planData;
  }, [planData]);

  const planTotal = useMemo(() => planData.reduce((sum, item) => sum + (item.value || 0), 0), [planData]);

  const previewUsers = useMemo(() => users.slice(0, 5), [users]);
  const previewResumes = useMemo(() => resumes.slice(0, 5), [resumes]);
  const previewFeedback = useMemo(() => feedback.slice(0, 8), [feedback]);

  return (
    <AdminLayout
      title="ResumeIQ Admin Dashboard"
      subtitle="Monitor user growth, resume analysis activity, and AI candidate matching insights."
    >
      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <Motion.section
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } }
        }}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = loading ? "-" : formatCompact(stats[card.key] ?? 0);
          const delta = deltas[card.key];

          return (
            <Motion.article
              key={card.key}
              variants={{
                hidden: { opacity: 0, scale: 0.96, y: 10 },
                show: { opacity: 1, scale: 1, y: 0 }
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              whileHover={{ scale: 1.015 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl transition-transform"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`} />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">{card.label}</p>
                  {loading ? (
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-3.5 w-16" />
                    </div>
                  ) : (
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-lg shadow-slate-950/40 transition-transform duration-300 group-hover:scale-105`}>
                    <Icon size={20} />
                  </div>
                  {loading ? (
                    <Skeleton className="h-6 w-14 rounded-full" />
                  ) : (
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        delta === null
                          ? "border-white/10 bg-white/5 text-slate-300"
                          : delta >= 0
                            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                            : "border-rose-300/20 bg-rose-400/10 text-rose-100"
                      }`}
                    >
                      {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}%`}
                    </span>
                  )}
                </div>
              </div>
              <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />
            </Motion.article>
          );
        })}
      </Motion.section>

      <Motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="grid gap-4 xl:grid-cols-3"
      >
        <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl xl:col-span-2">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-white">Total Users Growth</p>
              <p className="mt-1 text-sm text-slate-300">Cumulative users over the last 30 days.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-slate-200">
              Total: <span className="font-semibold text-white">{formatCompact(stats.totalUsers)}</span>
            </div>
          </div>

          <div className="mt-6 h-[260px]">
            {loading ? (
              <Skeleton className="h-full w-full rounded-3xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.userGrowth || []} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatIsoDayLabel}
                    tick={{ fill: "rgba(148,163,184,0.85)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    tick={{ fill: "rgba(148,163,184,0.85)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name="Users"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-white">Subscription Distribution</p>
              <p className="mt-1 text-sm text-slate-300">Plan mix across active users.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-slate-200">
              Total: <span className="font-semibold text-white">{formatCompact(planTotal)}</span>
            </div>
          </div>

          <div className="mt-6 h-[260px]">
            {loading ? (
              <Skeleton className="h-full w-full rounded-3xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value, name) => [formatCompact(value), name]}
                    contentStyle={{
                      background: "rgba(2,6,23,0.92)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: "16px",
                      padding: "10px 12px",
                      color: "rgba(226,232,240,0.92)"
                    }}
                  />
                  <Pie
                    data={chartPlanData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={92}
                    paddingAngle={chartPlanData.length > 1 ? 3 : 0}
                    stroke="rgba(15,23,42,0.5)"
                  >
                    {chartPlanData.map((entry) => (
                      <Cell key={entry.key} fill={planPalette[entry.key]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold">
            {planData.map((entry) => (
              <div key={entry.key} className="flex items-center gap-2 text-slate-200">
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: planPalette[entry.key] }} />
                <span style={{ color: planPalette[entry.key] }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl xl:col-span-3">
          <div className="pointer-events-none absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-white">Resume Upload Activity</p>
              <p className="mt-1 text-sm text-slate-300">Daily resume uploads over the last 30 days.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-slate-200">
              Total: <span className="font-semibold text-white">{formatCompact(stats.totalResumes)}</span>
            </div>
          </div>

          <div className="mt-6 h-[260px]">
            {loading ? (
              <Skeleton className="h-full w-full rounded-3xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.resumeUploads || []} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatIsoDayLabel}
                    tick={{ fill: "rgba(148,163,184,0.85)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    tick={{ fill: "rgba(148,163,184,0.85)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="uploads" name="Uploads" fill="#34d399" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </Motion.section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-white">Users Table</p>
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <Users size={14} />
              View all
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/40 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={`user-skel-${idx}`} className="border-t border-white/5">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
                      </tr>
                    ))
                  : previewUsers.map((user) => (
                      <tr key={user._id} className="border-t border-white/5">
                        <td className="px-4 py-3 font-medium text-slate-100">{user.name || "-"}</td>
                        <td className="px-4 py-3 text-slate-300">{user.email || "-"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                            {user.plan || "free"}
                          </span>
                        </td>
                      </tr>
                    ))}
                {!loading && previewUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      No users found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Motion.section>

        <Motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.03 }}
          className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-white">Resumes Table</p>
            <button
              type="button"
              onClick={() => navigate("/admin/resumes")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <FileSearch size={14} />
              View all
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/40 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Candidate</th>
                  <th className="px-4 py-3 font-medium">Resume File</th>
                  <th className="px-4 py-3 font-medium">ATS</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={`resume-skel-${idx}`} className="border-t border-white/5">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-44" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-6 w-12 rounded-full" /></td>
                      </tr>
                    ))
                  : previewResumes.map((resume) => (
                      <tr key={resume._id} className="border-t border-white/5">
                        <td className="px-4 py-3 font-medium text-slate-100">{resume.userName || "-"}</td>
                        <td className="px-4 py-3 text-slate-300">{resume.fileName || "-"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                            {resume.atsScore ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                {!loading && previewResumes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      No resumes found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Motion.section>
      </div>

      <Motion.section
        id="feedback-section"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              <MessageSquareMore size={20} />
            </span>
            <div>
              <p className="text-base font-semibold text-white">User Feedback</p>
              <p className="text-sm text-slate-300">Latest messages from users, sorted by newest first.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-slate-200">
            Showing: <span className="font-semibold text-white">{previewFeedback.length}</span>
          </div>
        </div>

        <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div key={`feedback-skel-${idx}`} className="rounded-3xl border border-white/10 bg-slate-950/20 p-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-3 h-3.5 w-28" />
                  <Skeleton className="mt-4 h-16 w-full" />
                </div>
              ))
            : previewFeedback.map((item) => (
                <Motion.article
                  key={item._id}
                  layout
                  initial={item.isRead ? false : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`rounded-3xl border p-4 transition ${
                    item.isRead
                      ? "border-white/10 bg-slate-950/20"
                      : "border-cyan-300/20 bg-cyan-300/[0.06] shadow-[0_18px_40px_rgba(34,211,238,0.08)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm ${item.isRead ? "font-medium text-slate-200" : "font-semibold text-white"}`}>
                        {item.email || item.userName || "Unknown user"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      item.isRead
                        ? "border-white/10 bg-white/5 text-slate-300"
                        : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                    }`}>
                      {item.category}
                    </span>
                  </div>

                  <p className={`mt-4 text-sm leading-6 ${item.isRead ? "text-slate-300" : "text-slate-100"}`}>
                    {item.message}
                  </p>
                </Motion.article>
              ))}

          {!loading && previewFeedback.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/20 px-4 py-10 text-center text-sm text-slate-400">
              No feedback has been submitted yet.
            </div>
          ) : null}
        </div>
      </Motion.section>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate("/admin/candidates")}
          className="group flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl transition hover:bg-white/10"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              <Search size={20} />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Search Candidates</p>
              <p className="text-sm text-slate-300">Filter candidates by role keywords.</p>
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-200 transition group-hover:translate-x-0.5">Open →</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/admin/ai-matching")}
          className="group flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl transition hover:bg-white/10"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              <Sparkles size={20} />
            </span>
            <div>
              <p className="text-base font-semibold text-white">AI Candidate Matching</p>
              <p className="text-sm text-slate-300">Paste job description and rank candidates.</p>
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-200 transition group-hover:translate-x-0.5">Open →</span>
        </button>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
