import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import API from "../services/api";
import AdminLayout from "../components/AdminLayout";

function AdminAIMatching() {
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requiredSkills, setRequiredSkills] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [shortlisted, setShortlisted] = useState(() => new Set());

  const topSummary = useMemo(() => {
    if (!candidates.length) return null;
    const best = candidates[0];
    return best ? `${best.name || "Candidate"} — ${best.matchScore ?? 0}% match` : null;
  }, [candidates]);

  const toggleShortlist = (id) => {
    setShortlisted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMatch = async () => {
    if (!String(jobDescription || "").trim()) {
      setError("Paste a job description to find best candidates.");
      setCandidates([]);
      setRequiredSkills([]);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await API.post("/admin/match-candidates", { jobDescription });
      const data = res.data || {};
      const nextSkills = Array.isArray(data.requiredSkills) ? data.requiredSkills : [];
      const nextCandidates = Array.isArray(data.candidates) ? data.candidates : [];
      nextCandidates.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
      setRequiredSkills(nextSkills);
      setCandidates(nextCandidates);
    } catch (fetchError) {
      console.error("AI candidate match error:", fetchError);
      setError(fetchError?.response?.data?.message || "Unable to match candidates for that job description.");
      setCandidates([]);
      setRequiredSkills([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout
      title="AI Candidate Matching"
      subtitle="Paste a job description to extract skills, calculate match score, and rank candidates (LinkedIn Recruiter style)."
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <span className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
                <Sparkles size={16} />
              </span>
              AI Candidate Matching
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {topSummary || "Find best candidates ranked by match score."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleMatch}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Matching..." : "Find Best Candidates"}
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr,1fr]">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400" htmlFor="admin-ai-jd">
              Paste Job Description
            </label>
            <textarea
              id="admin-ai-jd"
              rows="8"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder='Example: "We are looking for a Backend Developer with Node.js, MongoDB and Docker experience"'
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-cyan-300/30 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.10)]"
            />
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Extracted Skills
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {requiredSkills.length ? (
                requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">
                  {loading ? "Extracting..." : "Run matching to extract skills from the job description."}
                </span>
              )}
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <AnimatePresence mode="popLayout">
        {loading ? (
          <Motion.div
            key="ai-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300 backdrop-blur-xl"
          >
            Ranking candidates by match score...
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
          const id = candidate._id || candidate.resumeId || candidate.email;
          const isShortlisted = shortlisted.has(id);
          const matchedSkills = Array.isArray(candidate.matchedSkills) ? candidate.matchedSkills : [];
          const matchScore = Math.max(0, Math.min(100, Number(candidate.matchScore ?? 0)));

          return (
            <Motion.article
              layout
              key={id}
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
                  <p className="truncate text-base font-semibold text-white">{candidate.name || "Unknown"}</p>
                  <p className="truncate text-sm text-slate-300">{candidate.email || "-"}</p>
                  <p className="mt-2 truncate text-xs text-slate-400">
                    Resume: <span className="text-slate-200">{candidate.resumeFile || "-"}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    ATS {candidate.atsScore ?? 0}
                  </span>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                    Match {matchScore}%
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <span>Match Score</span>
                  <span className="text-slate-300">{matchScore}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-950/40">
                  <Motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${matchScore}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Matched Skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {matchedSkills.length ? (
                    matchedSkills.slice(0, 14).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1 text-xs text-slate-200"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No matched skills found for this resume.</span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleShortlist(id)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    isShortlisted
                      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                      : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  }`}
                >
                  <Star size={16} />
                  {isShortlisted ? "Shortlisted" : "Shortlist Candidate"}
                </button>
              </div>

              <div className="pointer-events-none absolute -right-12 -top-10 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />
            </Motion.article>
          );
        })}
      </Motion.section>

      {!loading && candidates.length === 0 && requiredSkills.length ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300 backdrop-blur-xl">
          No candidates matched the extracted skills yet. Try a different job description.
        </div>
      ) : null}
    </AdminLayout>
  );
}

export default AdminAIMatching;

