import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, CheckCheck, Crown, Lock, Sparkles, TrendingUp, Unlock, Zap } from "lucide-react";
import API from "../services/api";
import DashboardSidebar from "../components/DashboardSidebar";

const cosmicStars = [
  { top: "8%", left: "15%", size: "2px", opacity: 0.55 },
  { top: "14%", left: "40%", size: "2px", opacity: 0.45 },
  { top: "21%", left: "63%", size: "2px", opacity: 0.4 },
  { top: "32%", left: "84%", size: "3px", opacity: 0.4 },
  { top: "44%", left: "24%", size: "2px", opacity: 0.5 },
  { top: "51%", left: "72%", size: "2px", opacity: 0.35 },
  { top: "66%", left: "53%", size: "2px", opacity: 0.45 },
  { top: "73%", left: "88%", size: "3px", opacity: 0.42 },
  { top: "83%", left: "17%", size: "2px", opacity: 0.5 },
  { top: "89%", left: "61%", size: "2px", opacity: 0.38 }
];

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
  const [subscription, setSubscription] = useState({
    plan: "free",
    hasPremiumAccess: false,
    subscriptionExpiry: null
  });
  const glassCardClass =
    "rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,30,74,0.74),rgba(16,20,56,0.82))] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.32)] backdrop-blur-xl transition-all duration-300";

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      try {
        const res = await API.get(`/auth/profile/${userId}`);
        setSubscription({
          plan: res.data?.plan || "free",
          hasPremiumAccess: Boolean(res.data?.hasPremiumAccess),
          subscriptionExpiry: res.data?.subscriptionExpiry || null
        });
      } catch (fetchError) {
        console.error("Profile error:", fetchError);
      }
    };

    fetchProfile();
  }, [userId]);

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
  const hasPremiumAccess = Boolean(subscription?.hasPremiumAccess);

  const matchScoreValue = jobResult?.score ?? 0;
  const fitLevel =
    matchScoreValue >= 80 ? "Excellent Fit" : matchScoreValue >= 60 ? "Good Fit" : "Needs Work";
  const fitLevelClasses =
    matchScoreValue >= 80
      ? "border-emerald-300/25 bg-emerald-400/12 text-emerald-100"
      : matchScoreValue >= 60
      ? "border-amber-300/25 bg-amber-400/12 text-amber-100"
      : "border-rose-300/25 bg-rose-400/12 text-rose-100";
  const topMissingSkills = (jobResult?.missingSkills || []).slice(0, 4);
  const fitActionItems = String(jobResult?.suggestions || "")
    .split(/\n+|(?<=[.!?])\s+/)
    .map((item) => item.replace(/^[\s\-*•\d.]+/, "").trim())
    .filter(Boolean);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleMatchJob = async () => {
    if (!hasPremiumAccess) {
      navigate("/billing", { state: { plan: "premium" } });
      return;
    }

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

      const res = await API.post("/job/match", {
        resumeText: selectedResume?.extractedText || "",
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
    <div className="dashboard-shell relative min-h-screen overflow-hidden text-white">
      <div className="dashboard-glow dashboard-glow--one" />
      <div className="dashboard-glow dashboard-glow--two" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(59,130,246,0.18),transparent_22%),radial-gradient(circle_at_78%_10%,rgba(168,85,247,0.24),transparent_26%),radial-gradient(circle_at_88%_78%,rgba(244,114,182,0.18),transparent_22%),linear-gradient(180deg,#081125_0%,#0b1530_46%,#0d1228_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-70">
        {cosmicStars.map((star, index) => (
          <span
            key={`${star.top}-${star.left}-${index}`}
            className="absolute rounded-full bg-white"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              boxShadow: "0 0 18px rgba(255,255,255,0.35)"
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute left-[8%] top-[20%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[6%] top-[14%] h-80 w-80 rounded-full bg-fuchsia-500/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[6%] right-[8%] h-72 w-72 rounded-full bg-pink-400/14 blur-3xl" />

      <div className="relative z-10 flex min-h-screen">
        <DashboardSidebar
          activeItem="jobMatch"
          navigate={navigate}
          onLogout={handleLogout}
          userId={userId}
        />

        <Motion.main
          className="flex-1 overflow-y-auto px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-10"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white md:text-[3.2rem]">Job Matcher</h1>
                <p className="mt-3 max-w-3xl text-base leading-8 text-slate-300">
                  Compare any uploaded resume against a job description and see match score, missing skills,
                  and action items before you apply.
                </p>
                {hasPremiumAccess && (
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200/12 bg-[linear-gradient(90deg,rgba(80,90,72,0.72),rgba(59,73,112,0.72))] px-5 py-3 text-sm font-semibold text-amber-50 shadow-[0_10px_30px_rgba(245,158,11,0.08)]">
                    <Zap size={15} className="text-amber-200" />
                    Priority AI Processing Enabled
                  </div>
                )}
              </div>

              <Motion.div
                className={`inline-flex items-center gap-2 rounded-[22px] border px-5 py-3 text-sm font-semibold shadow-[0_16px_40px_rgba(14,165,233,0.08)] backdrop-blur-xl ${
                  hasPremiumAccess
                    ? "border-emerald-300/12 bg-[linear-gradient(90deg,rgba(34,74,88,0.76),rgba(25,39,88,0.76))] text-emerald-100"
                    : "border-cyan-300/10 bg-[linear-gradient(90deg,rgba(28,52,92,0.78),rgba(42,33,89,0.76))] text-cyan-100"
                }`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                whileHover={{ y: -2, scale: 1.02 }}
              >
                {hasPremiumAccess ? <Sparkles size={16} /> : <Lock size={16} />}
                {hasPremiumAccess ? "Premium Unlocked" : "Upgrade to Premium"}
              </Motion.div>
            </div>

            <div className="relative mt-8">
              <div className={hasPremiumAccess ? "" : "blur-sm opacity-60 pointer-events-none"}>
                <Motion.section
                  className={`${glassCardClass} relative overflow-hidden px-6 py-7 md:px-8 md:py-8`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.4 }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_top,rgba(65,146,255,0.18),transparent_26%),radial-gradient(circle_at_right_top,rgba(206,113,255,0.18),transparent_30%),radial-gradient(circle_at_center_bottom,rgba(56,189,248,0.08),transparent_24%)]" />
                  <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/10" />
                  <div className="pointer-events-none absolute left-0 top-24 h-48 w-[2px] bg-gradient-to-b from-cyan-300/0 via-cyan-300/60 to-cyan-300/0 shadow-[0_0_24px_rgba(34,211,238,0.45)]" />
                  <div className="pointer-events-none absolute bottom-0 left-1/2 h-[2px] w-48 -translate-x-1/2 bg-gradient-to-r from-cyan-300/0 via-cyan-300/80 to-cyan-300/0 shadow-[0_0_28px_rgba(34,211,238,0.45)]" />

                  <div className="relative">
                    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <h2 className="text-[1.95rem] font-bold tracking-tight text-white">AI Job Match Analyzer</h2>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            hasPremiumAccess
                              ? "border border-emerald-300/12 bg-emerald-400/12 text-emerald-100"
                              : "border border-amber-300/12 bg-amber-400/12 text-amber-100"
                          }`}
                        >
                          {hasPremiumAccess ? <Unlock size={14} /> : <Lock size={14} />}
                          {hasPremiumAccess ? "Unlocked" : "Premium"}
                        </span>
                      </div>

                      {!hasPremiumAccess && (
                        <button
                          type="button"
                          onClick={() => navigate("/billing", { state: { plan: "premium" } })}
                          className="dashboard-btn-secondary inline-flex items-center gap-2"
                        >
                          <Crown size={16} />
                          Upgrade to Premium
                        </button>
                      )}
                    </div>

                    {!hasPremiumAccess && (
                      <p className="mb-6 inline-flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
                        <Lock size={15} />
                        Upgrade to Premium to unlock Job Match Analyzer
                      </p>
                    )}

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[330px_1fr]">
                      <div className="space-y-5">
                        <div>
                          <label className="text-[1.05rem] font-semibold text-slate-100">Choose Resume</label>
                          <select
                            value={selectedResumeId}
                            onChange={(e) => setSelectedResumeId(e.target.value)}
                            className="mt-3 w-full rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(20,24,58,0.96),rgba(16,20,46,0.96))] px-4 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.10)]"
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

                        <Motion.div
                          className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,23,54,0.94),rgba(14,18,43,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                          whileHover={{ y: -3 }}
                          transition={{ duration: 0.2 }}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-500">
                            Selected Resume
                          </p>
                          {selectedResume ? (
                            <>
                              <p className="mt-4 text-lg font-medium text-slate-100">{selectedResume.fileName}</p>
                              <p className="mt-2 text-sm text-slate-300">
                                ATS Score: <span className="font-semibold text-cyan-200">{selectedResume.atsScore}%</span>
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Uploaded on {new Date(selectedResume.uploadedAt).toLocaleDateString()}
                              </p>
                              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-cyan-300/14 bg-[linear-gradient(90deg,rgba(25,56,93,0.72),rgba(21,44,74,0.72))] px-4 py-3 text-sm text-cyan-100">
                                <TrendingUp size={14} />
                                Ready for match analysis
                              </div>
                            </>
                          ) : (
                            <p className="mt-3 text-sm text-slate-400">Upload a resume to start matching jobs.</p>
                          )}
                        </Motion.div>
                      </div>

                      <div>
                        <label className="text-[1.05rem] font-semibold text-slate-100">Job Description</label>
                        <textarea
                          rows="11"
                          value={jobDesc}
                          placeholder="Paste the full job description here..."
                          onChange={(e) => setJobDesc(e.target.value)}
                          className="mt-3 min-h-[230px] w-full rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,19,48,0.98),rgba(13,18,40,0.98))] px-5 py-5 text-base leading-8 text-slate-100 outline-none transition duration-300 placeholder:text-slate-500 focus:-translate-y-0.5 focus:border-cyan-400/50 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.10)]"
                        />

                        <div className="mt-6 flex flex-wrap items-center gap-4">
                          <Motion.button
                            type="button"
                            onClick={handleMatchJob}
                            disabled={loading}
                            className="inline-flex items-center gap-3 rounded-2xl border border-cyan-200/12 bg-[linear-gradient(90deg,#44d7d2_0%,#4c77ff_100%)] px-8 py-4 text-lg font-semibold text-white shadow-[0_18px_36px_rgba(59,130,246,0.28)] transition hover:shadow-[0_22px_44px_rgba(59,130,246,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <BriefcaseBusiness size={18} />
                            {loading ? "Analyzing..." : "Analyze Job Match"}
                          </Motion.button>

                          {error && (
                            <Motion.p
                              className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {error}
                            </Motion.p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Motion.section>
              </div>

              {!hasPremiumAccess && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex max-w-md flex-col items-center rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,42,0.96),rgba(14,17,44,0.96))] p-6 text-center shadow-2xl backdrop-blur-md">
                    <div className="mb-4 rounded-2xl bg-cyan-400/10 p-4 text-cyan-200">
                      <Lock size={26} />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Premium Feature Locked</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Upgrade to Premium to unlock AI Job Match Analyzer and compare resumes against job descriptions.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/billing", { state: { plan: "premium" } })}
                    className="dashboard-btn-primary mt-5 inline-flex items-center gap-2"
                  >
                    <Crown size={16} />
                    Upgrade to Premium
                  </button>
                </div>
              </div>
              )}
            </div>

            {jobResult && hasPremiumAccess && (
              <Motion.section
                className={`${glassCardClass} relative mt-8 overflow-hidden`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.10),transparent_20%)]" />
                <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/10" />
                <div className="pointer-events-none absolute left-0 top-20 h-48 w-[2px] bg-gradient-to-b from-cyan-300/0 via-cyan-300/60 to-cyan-300/0 shadow-[0_0_24px_rgba(34,211,238,0.4)]" />
                <div className="pointer-events-none absolute bottom-0 right-20 h-[2px] w-48 bg-gradient-to-r from-fuchsia-300/0 via-fuchsia-300/70 to-fuchsia-300/0 shadow-[0_0_24px_rgba(217,70,239,0.35)]" />
                <div className="relative">
                  <div className="grid grid-cols-1 gap-10 xl:grid-cols-[210px_1fr]">
                    <Motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05, duration: 0.35 }}
                      className="flex flex-col items-center justify-center"
                    >
                      <div className="mx-auto w-44">
                        <CircularProgressbar
                          value={jobResult.score}
                          text={`${jobResult.score}%`}
                          styles={{
                            path: {
                              stroke: jobResult.score >= 80 ? "#41f0d5" : "#ffb11b",
                              strokeLinecap: "round"
                            },
                            text: { fill: "#f8fafc", fontSize: "18px", fontWeight: 800 },
                            trail: { stroke: "rgba(125,138,181,0.22)" },
                            root: {
                              filter: "drop-shadow(0 0 18px rgba(255,177,27,0.18))"
                            }
                          }}
                        />
                      </div>
                      <p className="mt-4 text-center text-[1.02rem] font-medium text-slate-200">Job Match Score</p>
                    </Motion.div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-[2rem] font-bold tracking-tight text-white">Fit Insights</h2>
                        <span className={`rounded-full border px-5 py-2 text-sm font-semibold shadow-[0_10px_24px_rgba(245,158,11,0.08)] ${fitLevelClasses}`}>
                          {fitLevel}
                        </span>
                      </div>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-300">
                          <span>Overall Match</span>
                          <span>{jobResult.score}% aligned</span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                          <Motion.div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#46b8f6_0%,#43e9d8_65%,#6cd4ff_100%)] shadow-[0_0_18px_rgba(67,233,216,0.35)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${jobResult.score}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <p className="text-[1.15rem] font-semibold text-slate-100">Missing Skills</p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          {topMissingSkills.length ? (
                            topMissingSkills.map((skill, index) => (
                              <Motion.span
                                key={`${skill}-${index}`}
                                className="rounded-full border border-pink-300/28 bg-[linear-gradient(90deg,rgba(126,39,112,0.22),rgba(88,39,120,0.16))] px-4 py-2 text-sm font-medium text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04, duration: 0.2 }}
                              >
                                {skill}
                              </Motion.span>
                            ))
                          ) : (
                            <span className="text-sm text-emerald-300">No major missing skills detected.</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-7 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(23,26,63,0.86),rgba(17,19,50,0.9))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <p className="text-[1.15rem] font-semibold text-slate-100">Action Items</p>
                        <ul className="mt-4 space-y-3 text-base text-slate-300">
                          {(fitActionItems.length
                            ? fitActionItems
                            : ["Customize your summary and experience bullets using the exact language from the job description."]).map((item, index) => (
                            <Motion.li
                              key={`${item}-${index}`}
                              className="flex items-center gap-3 rounded-2xl bg-[linear-gradient(90deg,rgba(32,36,74,0.95),rgba(58,31,87,0.72))] px-4 py-3"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.06, duration: 0.2 }}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/12 text-cyan-200">
                                <CheckCheck size={14} />
                              </span>
                              <span>{item}</span>
                            </Motion.li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </Motion.section>
            )}
          </div>
        </Motion.main>
      </div>

    </div>
  );
}

export default JobMatcher;
