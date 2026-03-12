import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Sparkles, TrendingUp } from "lucide-react";
import API from "../services/api";
import DashboardSidebar from "../components/DashboardSidebar";

function JobMatcher() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  let userId = null;
  try {
    if (token) {
      const decoded = jwtDecode(token);
      userId = decoded.id;
    }
  } catch {
    console.log("Token decode error");
  }

  const [history, setHistory] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobResult, setJobResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const glassCardClass =
    "rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl";

  useEffect(() => {
    const getHistory = async () => {
      if (!userId) {
        setHistoryLoading(false);
        return;
      }

      try {
        const res = await API.get(`/resume/history/${userId}`);
        const resumes = Array.isArray(res.data) ? res.data : [];
        setHistory(resumes);
        setSelectedResumeId(resumes[0]?._id || "");
      } catch (fetchError) {
        console.error("History error:", fetchError);
        setError("Unable to load uploaded resumes right now.");
      } finally {
        setHistoryLoading(false);
      }
    };

    getHistory();
  }, [userId]);

  const selectedResume = useMemo(
    () => history.find((item) => item._id === selectedResumeId) || null,
    [history, selectedResumeId]
  );

  const matchScoreValue = jobResult?.matchScore ?? 0;
  const fitLevel =
    matchScoreValue >= 80 ? "Excellent Fit" : matchScoreValue >= 60 ? "Good Fit" : "Needs Work";
  const fitLevelClasses =
    matchScoreValue >= 80
      ? "border-emerald-400/45 bg-emerald-500/10 text-emerald-200"
      : matchScoreValue >= 60
        ? "border-amber-400/45 bg-amber-500/10 text-amber-200"
        : "border-rose-400/45 bg-rose-500/10 text-rose-200";
  const totalJobSkills = (jobResult?.matchedSkills?.length || 0) + (jobResult?.missingSkills?.length || 0);
  const coverageMatched = totalJobSkills
    ? Math.round(((jobResult?.matchedSkills?.length || 0) / totalJobSkills) * 100)
    : 0;
  const topMissingSkills = (jobResult?.missingSkills || []).slice(0, 4);
  const fitActionItems = [
    topMissingSkills.length
      ? `Add these keywords in projects or experience: ${topMissingSkills.join(", ")}.`
      : "No major keyword gaps detected for this job description.",
    matchScoreValue < 70
      ? "Customize the summary and achievements with exact role terms from the JD."
      : "Add one more quantified achievement that mirrors the top requirement.",
    "Keep your core skills close to the top of the resume for stronger ATS parsing."
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleMatchJob = async () => {
    if (!selectedResumeId) {
      setError("Please upload a resume first.");
      return;
    }

    if (!jobDesc.trim()) {
      setError("Please paste a job description.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await API.post("/resume/match-job", {
        resumeId: selectedResumeId,
        jobDescription: jobDesc
      });

      setJobResult(res.data || null);
    } catch (matchError) {
      console.error("Job match error:", matchError);
      setError("Unable to analyze this job description right now.");
      setJobResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-shell min-h-screen text-white">
      <div className="dashboard-glow dashboard-glow--one" />
      <div className="dashboard-glow dashboard-glow--two" />

      <div className="relative z-10 flex min-h-screen">
        <DashboardSidebar
          activeItem="jobMatch"
          navigate={navigate}
          onLogout={handleLogout}
          userId={userId}
        />

        <motion.main
          className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Job Matcher</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Compare any uploaded resume against a job description and see match score, missing skills,
                and action items before you apply.
              </p>
            </div>

            <motion.div
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.08)]"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              whileHover={{ y: -2, scale: 1.02 }}
            >
              <Sparkles size={16} />
              AI powered fit insights
            </motion.div>
          </div>

          <motion.section
            className={`${glassCardClass} mt-8 relative overflow-hidden`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4 }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-200">Choose Resume</label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700/70 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
                    disabled={historyLoading || !history.length}
                  >
                    {historyLoading ? (
                      <option>Loading resumes...</option>
                    ) : history.length ? (
                      history.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.fileName}
                        </option>
                      ))
                    ) : (
                      <option>No resumes uploaded yet</option>
                    )}
                  </select>
                </div>

                <motion.div
                  className="rounded-2xl border border-slate-700/50 bg-slate-950/40 p-4"
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Selected Resume
                  </p>
                  {selectedResume ? (
                    <>
                      <p className="mt-3 text-sm font-medium text-slate-100">{selectedResume.fileName}</p>
                      <p className="mt-2 text-sm text-slate-300">
                        ATS Score: <span className="font-semibold text-cyan-200">{selectedResume.atsScore}%</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Uploaded on {new Date(selectedResume.uploadedAt).toLocaleDateString()}
                      </p>
                      <div className="mt-4 flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100">
                        <TrendingUp size={14} />
                        Ready for match analysis
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">Upload a resume to start matching jobs.</p>
                  )}
                </motion.div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-200">Job Description</label>
                <textarea
                  rows="11"
                  value={jobDesc}
                  placeholder="Paste the full job description here..."
                  onChange={(e) => setJobDesc(e.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-700/70 bg-slate-950/60 px-4 py-4 text-sm text-slate-100 outline-none transition duration-300 placeholder:text-slate-500 focus:-translate-y-0.5 focus:border-cyan-400/50 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.10)]"
                />

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <motion.button
                    type="button"
                    onClick={handleMatchJob}
                    disabled={loading}
                    className="dashboard-btn-primary inline-flex items-center gap-2"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <BriefcaseBusiness size={18} />
                    {loading ? "Analyzing..." : "Analyze Job Match"}
                  </motion.button>

                  {error && (
                    <motion.p
                      className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>
          </motion.section>

          {jobResult && (
            <motion.section
              className={`${glassCardClass} mt-8`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-[240px_1fr]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05, duration: 0.35 }}
                >
                  <div className="mx-auto w-40">
                    <CircularProgressbar
                      value={jobResult.matchScore}
                      text={`${jobResult.matchScore}%`}
                      styles={{
                        path: {
                          stroke: jobResult.matchScore >= 70 ? "#22c55e" : "#f59e0b",
                          strokeLinecap: "round"
                        },
                        text: { fill: "#f8fafc", fontSize: "18px", fontWeight: 700 },
                        trail: { stroke: "#334155" }
                      }}
                    />
                  </div>
                  <p className="mt-4 text-center text-sm font-semibold text-slate-200">Job Match Score</p>
                </motion.div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">Fit Insights</h2>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${fitLevelClasses}`}>
                      {fitLevel}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-300">
                      <span>Keyword Coverage</span>
                      <span>{coverageMatched}% matched</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-700/70">
                      <motion.div
                        className="h-full rounded-full bg-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${coverageMatched}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">Matched Skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(jobResult.matchedSkills || []).length ? (
                          jobResult.matchedSkills.map((skill, index) => (
                            <motion.span
                              key={`${skill}-${index}`}
                              className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.04, duration: 0.2 }}
                            >
                              {skill}
                            </motion.span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">No matched skills detected yet.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-200">Missing Skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(jobResult.missingSkills || []).length ? (
                          jobResult.missingSkills.map((skill, index) => (
                            <motion.span
                              key={`${skill}-${index}`}
                              className="rounded-full border border-rose-400/35 bg-rose-500/10 px-3 py-1 text-sm font-medium text-rose-200"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.04, duration: 0.2 }}
                            >
                              {skill}
                            </motion.span>
                          ))
                        ) : (
                          <span className="text-sm text-emerald-300">No missing skills detected.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-slate-950/35 p-4">
                    <p className="text-sm font-medium text-slate-100">Action Items</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {fitActionItems.map((item, index) => (
                        <motion.li
                          key={`${item}-${index}`}
                          className="rounded-xl bg-slate-900/50 px-3 py-2"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.06, duration: 0.2 }}
                        >
                          {item}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </motion.main>
      </div>
    </div>
  );
}

export default JobMatcher;
