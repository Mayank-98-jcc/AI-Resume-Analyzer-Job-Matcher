import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Search, Star } from "lucide-react";
import API from "../services/api";
import AdminLayout from "../components/AdminLayout";

const rolePresets = [
  { label: "Backend Developer", value: "backend" },
  { label: "Frontend Developer", value: "frontend" },
  { label: "Data Analyst", value: "data_analyst" },
  { label: "HR", value: "hr" },
  { label: "Marketing", value: "marketing" }
];

function normalizeRoleFromTitle(input) {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return "";

  if (value.includes("backend")) return "backend";
  if (value.includes("front")) return "frontend";
  if (value.includes("data") || value.includes("analyst") || value.includes("analytics")) return "data_analyst";
  if (value === "hr" || value.includes("human resources")) return "hr";
  if (value.includes("marketing")) return "marketing";

  return value.replace(/\s+/g, "_");
}

function AdminCandidates() {
  const [jobTitle, setJobTitle] = useState("");
  const [activeRole, setActiveRole] = useState("backend");
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shortlisted, setShortlisted] = useState(() => new Set());

  const activeLabel = useMemo(
    () => rolePresets.find((preset) => preset.value === activeRole)?.label || "Custom role",
    [activeRole]
  );

  const runSearch = async (roleValue) => {
    if (!roleValue) return;

    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/filter", { params: { role: roleValue } });
      setCandidates(Array.isArray(res.data) ? res.data : []);
      setActiveRole(roleValue);
    } catch (fetchError) {
      console.error("Candidate filter error:", fetchError);
      setError(fetchError?.response?.data?.message || "Unable to fetch candidates for that job title.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedRole = normalizeRoleFromTitle(jobTitle);
    runSearch(normalizedRole);
  };

  const toggleShortlist = (candidateId) => {
    setShortlisted((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  return (
    <AdminLayout
      title="Search Candidates"
      subtitle="Search by job title and automatically shortlist matching candidates based on extracted resume skills."
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-white">Search by Job Title</p>
            <p className="mt-1 text-sm text-slate-300">
              Example: Backend Developer, Frontend Developer, Data Analyst, HR, Marketing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-xl">
            <label className="sr-only" htmlFor="admin-candidate-search">
              Job Title
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3">
              <Search size={16} className="text-slate-400" />
              <input
                id="admin-candidate-search"
                type="text"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Search by Job Title"
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {rolePresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                setJobTitle(preset.label);
                runSearch(preset.value);
              }}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                activeRole === preset.value
                  ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
          <p className="text-sm text-slate-200">
            Showing matches for <span className="font-semibold text-white">{activeLabel}</span>
          </p>
          <p className="text-sm text-slate-300">
            {loading ? "Searching..." : `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <AnimatePresence mode="popLayout">
        {loading ? (
          <Motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300 backdrop-blur-xl"
          >
            Fetching best matching candidates...
          </Motion.div>
        ) : null}
      </AnimatePresence>

      <Motion.section
        layout
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {candidates.map((candidate) => {
          const isShortlisted = shortlisted.has(candidate._id);
          const skills = Array.isArray(candidate.skills) ? candidate.skills : [];

          return (
            <Motion.article
              layout
              key={candidate._id}
              variants={{
                hidden: { opacity: 0, y: 10, scale: 0.98 },
                show: { opacity: 1, y: 0, scale: 1 }
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`relative overflow-hidden rounded-3xl border bg-white/5 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl ${
                isShortlisted ? "border-emerald-300/35" : "border-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">
                    {candidate.userName || candidate.name || "Unknown"}
                  </p>
                  <p className="truncate text-sm text-slate-300">
                    {candidate.userEmail || candidate.email || "-"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  ATS {candidate.atsScore ?? 0}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.length ? (
                    skills.slice(0, 12).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1 text-xs text-slate-200"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No skills extracted</span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleShortlist(candidate._id)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    isShortlisted
                      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                      : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  }`}
                >
                  <Star size={16} />
                  {isShortlisted ? "Shortlisted" : "Shortlist Candidate"}
                </button>

                <span className="text-xs text-slate-400">
                  {candidate.plan ? `${String(candidate.plan).toUpperCase()} plan` : ""}
                </span>
              </div>

              <div className="pointer-events-none absolute -right-12 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />
            </Motion.article>
          );
        })}
      </Motion.section>

      {!loading && candidates.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300 backdrop-blur-xl">
          No matching candidates found yet. Try another job title.
        </div>
      ) : null}

    </AdminLayout>
  );
}

export default AdminCandidates;
