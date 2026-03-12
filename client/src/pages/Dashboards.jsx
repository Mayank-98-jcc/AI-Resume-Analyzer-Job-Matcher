import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Unlock } from "lucide-react";
import API from "../services/api";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { jwtDecode } from "jwt-decode";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileAlt
} from "react-icons/fa";
import DashboardSidebar from "../components/DashboardSidebar";

function Dashboard() {
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

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [history, setHistory] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [sectionAnalysis, setSectionAnalysis] = useState(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [resumeSummary, setResumeSummary] = useState([]);
  const [summaryCertifications, setSummaryCertifications] = useState([]);
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState("");
  const [careerSuggestions, setCareerSuggestions] = useState([]);
  const [strengthData, setStrengthData] = useState(null);
  const [rankPercentile, setRankPercentile] = useState(null);
  const [animatedRankPercentile, setAnimatedRankPercentile] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const previousRankRef = useRef(0);

  const latestScore = result?.atsScore ?? "-";
  const skillsFound = result?.skills?.length ?? "-";
  const latestResume = history[0] || null;
  const activeResumeId = result?.resumeId || latestResume?._id || null;
  const strengthMeter =
    result?.strengthMeter ||
    latestResume?.strengthMeter ||
    strengthData ||
    null;
  const activeSuggestions =
    result?.suggestions?.length
      ? result.suggestions
      : latestResume?.suggestions || [];
  const activeSuggestionProgress =
    result?.suggestionProgress ||
    latestResume?.suggestionProgress ||
    null;

  const strengthMetrics = [
    { key: "formatting", label: "Formatting Score", color: "bg-cyan-400" },
    { key: "content", label: "Content Score", color: "bg-emerald-400" },
    { key: "skills", label: "Skills Score", color: "bg-amber-400" },
    { key: "atsCompatibility", label: "ATS Compatibility Score", color: "bg-indigo-400" }
  ];

  const sectionChecklist = [
    { key: "summary", label: "Summary" },
    { key: "skills", label: "Skills" },
    { key: "experience", label: "Experience" },
    { key: "education", label: "Education" },
    { key: "projects", label: "Projects" },
    { key: "certifications", label: "Certifications" }
  ];

  const glassCardClass =
    "rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-xl transition-all hover:shadow-2xl";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const displayName = profileName || "there";

  const getResumeRanking = async (atsScoreValue) => {
    const numericAtsScore = Number(atsScoreValue);

    if (!Number.isFinite(numericAtsScore)) {
      setRankPercentile(null);
      return;
    }

    try {
      const res = await API.post("/resume/ranking", {
        atsScore: numericAtsScore
      });
      setRankPercentile(Number(res.data?.percentile));
    } catch (error) {
      console.error("Resume ranking error:", error);
      setRankPercentile(null);
    }
  };

  const uploadResume = async () => {
    if (!file) {
      alert("Please select a resume first");
      return;
    }

    try {
      setUploadError("");
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("userId", userId);

      const res = await API.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setResult(res.data);
      setResumeSummary([]);
      setSummaryCertifications([]);
      setSummaryError("");
      setCareerSuggestions([]);
      setCareerError("");
      setIsUnlocked(true);
      setShowUnlockAnimation(true);
      await getResumeRanking(res.data?.atsScore);
      getHistory();
    } catch (error) {
      console.error("Upload error:", error);
      const apiError = error?.response?.data?.error || "";
      const isInvalidResume = error?.response?.data?.code === "INVALID_RESUME";
      setUploadError(
        isInvalidResume
          ? apiError || "This PDF is not a resume. Please upload a valid resume."
          : "Upload failed. Please try again."
      );
    }
  };

  const getHistory = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await API.get(`/resume/history/${userId}`);
      setHistory(res.data);
    } catch (error) {
      console.error("History error:", error);
    }
  }, [userId]);

  const downloadReport = () => {
    if (!result) return;

    const doc = new jsPDF();

    doc.text("AI Resume Analysis Report", 20, 20);
    doc.text(`ATS Score: ${result.atsScore}%`, 20, 40);

    doc.text("Skills:", 20, 60);
    doc.text(result.skills.join(", "), 20, 70);

    doc.text("Missing Skills:", 20, 90);
    doc.text(result.missingSkills.join(", "), 20, 100);

    doc.save("resume-report.pdf");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const getSuggestions = async () => {
    if (!activeResumeId) {
      alert("Please upload or select a resume first");
      return;
    }

    try {
      setSuggestionLoading(true);
      setSuggestionError("");

      const res = await API.post("/resume/suggestions", {
        resumeId: activeResumeId
      });

      const suggestions = res.data?.suggestions || [];

      setResult((prev) => {
        if (!prev || prev.resumeId !== activeResumeId) return prev;
        return {
          ...prev,
          suggestions
        };
      });

      setHistory((prev) =>
        prev.map((item) =>
          item._id === activeResumeId ? { ...item, suggestions } : item
        )
      );
    } catch (error) {
      console.error("Suggestions error:", error);
      setSuggestionError("Unable to fetch AI suggestions right now.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const generateSummary = async () => {
    const sourceText =
      result?.resumeText ||
      latestResume?.extractedText ||
      "";

    if (!sourceText.trim()) {
      setSummaryError("No resume text available to summarize.");
      setResumeSummary([]);
      return;
    }

    try {
      setSummaryLoading(true);
      setSummaryError("");

      const res = await API.post("/resume/generate-summary", {
        resumeText: sourceText
      });

      const normalizedSummary = Array.isArray(res.data?.summary)
        ? res.data.summary
        : String(res.data?.summary || "")
            .split("\n")
            .map((line) => line.replace(/^[\s\-*•\d.]+/, "").trim())
            .filter(Boolean)
            .slice(0, 4);

      setResumeSummary(normalizedSummary);
      setSummaryCertifications(
        Array.isArray(res.data?.certifications) ? res.data.certifications : []
      );
    } catch (error) {
      console.error("Summary generator error:", error);
      setSummaryError("Unable to generate summary right now.");
      setResumeSummary([]);
      setSummaryCertifications([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const generateCareerSuggestions = async () => {
    const sourceSkills =
      result?.skills ||
      latestResume?.skills ||
      [];

    if (!Array.isArray(sourceSkills) || !sourceSkills.length) {
      setCareerError("No extracted skills available for career suggestions.");
      setCareerSuggestions([]);
      return;
    }

    try {
      setCareerLoading(true);
      setCareerError("");

      const res = await API.post("/resume/career-suggestions", {
        skills: sourceSkills
      });

      setCareerSuggestions(Array.isArray(res.data?.careers) ? res.data.careers : []);
    } catch (error) {
      console.error("Career suggestions error:", error);
      setCareerError("Unable to generate career suggestions right now.");
      setCareerSuggestions([]);
    } finally {
      setCareerLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      getHistory();
    }
  }, [getHistory, userId]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setProfileName("");
        return;
      }

      try {
        const res = await API.get(`/auth/profile/${userId}`);
        setProfileName(res.data?.name || "");
      } catch (error) {
        console.error("Profile fetch error:", error);
        setProfileName("");
      }
    };

    fetchProfile();
  }, [userId]);

  useEffect(() => {
    const fetchStrengthMeter = async () => {
      if (!activeResumeId) {
        setStrengthData(null);
        return;
      }

      if (result?.strengthMeter || latestResume?.strengthMeter) {
        setStrengthData(null);
        return;
      }

      try {
        const res = await API.post("/resume/strength-meter", {
          resumeId: activeResumeId
        });
        setStrengthData(res.data || null);
      } catch (error) {
        console.error("Strength meter error:", error);
        setStrengthData(null);
      }
    };

    fetchStrengthMeter();
  }, [activeResumeId, result, latestResume]);

  useEffect(() => {
    const fetchSectionAnalysis = async () => {
      if (!activeResumeId) {
        setSectionAnalysis(null);
        setSectionError("");
        return;
      }

      try {
        setSectionLoading(true);
        setSectionError("");

        const res = await API.post("/resume/analyze-sections", {
          resumeId: activeResumeId
        });

        setSectionAnalysis(res.data?.sections || null);
      } catch (error) {
        console.error("Section analyzer error:", error);
        setSectionError("Unable to analyze resume sections right now.");
        setSectionAnalysis(null);
      } finally {
        setSectionLoading(false);
      }
    };

    fetchSectionAnalysis();
  }, [activeResumeId]);

  useEffect(() => {
    if (rankPercentile === null) {
      setAnimatedRankPercentile(0);
      previousRankRef.current = 0;
      return;
    }

    const from = previousRankRef.current;
    const to = Math.max(0, Math.min(100, Number(rankPercentile) || 0));
    if (from === to) return;

    const durationMs = 1800;
    const start = performance.now();
    let frameId = 0;

    const tick = (now) => {
      const linearProgress = Math.min((now - start) / durationMs, 1);
      const easedProgress = 1 - (1 - linearProgress) ** 3;
      const nextValue = Math.round(from + (to - from) * easedProgress);
      setAnimatedRankPercentile(nextValue);
      previousRankRef.current = nextValue;

      if (linearProgress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [rankPercentile]);

  useEffect(() => {
    setResumeSummary([]);
    setSummaryCertifications([]);
    setSummaryError("");
    setCareerSuggestions([]);
    setCareerError("");
  }, [activeResumeId]);

  useEffect(() => {
    if (!showUnlockAnimation) return undefined;

    const timer = window.setTimeout(() => {
      setShowUnlockAnimation(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [showUnlockAnimation]);

  return (
    <div className="dashboard-shell min-h-screen text-white">
      <div className="dashboard-glow dashboard-glow--one" />
      <div className="dashboard-glow dashboard-glow--two" />

      <div className="relative z-10 flex min-h-screen">
        <DashboardSidebar
          activeItem="home"
          navigate={navigate}
          onLogout={handleLogout}
          userId={userId}
        />

        <motion.main
          className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-xl">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {greeting} {displayName} <span className="dashboard-wave-hand">👋</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Ready to optimize your resume today?
            </p>
          </section>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="dashboard-stat-card">
              <p className="dashboard-stat-label">Total Resumes</p>
              <p className="dashboard-stat-value">{history.length}</p>
            </div>
            <div className="dashboard-stat-card">
              <p className="dashboard-stat-label">Latest ATS Score</p>
              <p className="dashboard-stat-value">{latestScore}</p>
            </div>
            <div className="dashboard-stat-card">
              <p className="dashboard-stat-label">Skills Found</p>
              <p className="dashboard-stat-value">{skillsFound}</p>
            </div>
          </div>

          <section id="dashboard-upload-section" className={`${glassCardClass} mt-8 scroll-mt-24`}>
            <h2 className="text-xl font-semibold">Upload Resume</h2>
            <p className="mt-1 text-sm text-slate-300">Choose file first, then click Analyze Resume</p>

            <div
              className={`dashboard-upload-zone mt-5 ${dragActive ? "dashboard-upload-zone--active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const droppedFile = e.dataTransfer.files?.[0] || null;
                if (droppedFile) {
                  setUploadError("");
                  setFile(droppedFile);
                }
              }}
            >
              <div className="dashboard-upload-zone__inner">
                <FaFileAlt className="dashboard-upload-zone__icon" />
                <label className="dashboard-upload-zone__choose cursor-pointer">
                  CHOOSE FILES
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0] || null;
                      if (selectedFile) {
                        setUploadError("");
                        setFile(selectedFile);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <p className="dashboard-upload-zone__hint">or drop files here</p>
              </div>
            </div>

            {file && (
              <div className="dashboard-file mt-4">
                <p className="font-medium text-cyan-200">{file.name}</p>
                <p className="text-xs text-slate-300">Ready to analyze</p>
              </div>
            )}

            <button onClick={uploadResume} className="dashboard-btn-primary mt-5">
              Analyze Resume
            </button>

            {uploadError && (
              <div className="dashboard-upload-error mt-4" role="alert">
                {uploadError}
              </div>
            )}
          </section>

          {rankPercentile !== null && (
            <section className="mt-6 rounded-xl bg-gray-800 p-6 shadow-lg">
              <h2 className="text-xl font-semibold">Resume Performance</h2>
              <p className="mt-2 text-sm text-slate-200">
                Your resume is better than {animatedRankPercentile}% of users
              </p>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${animatedRankPercentile}%`, transition: "width 180ms ease-out" }}
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-blue-300">{animatedRankPercentile}%</p>
            </section>
          )}

          <div className="mt-8">
            <div className="space-y-8">
              {result && (
                <section className={glassCardClass}>
                  <h2 className="text-xl font-semibold">ATS Score</h2>

                  <div className="mx-auto mt-6 w-40">
                    <CircularProgressbar
                      value={result.atsScore}
                      text={`${result.atsScore}%`}
                      styles={{
                        path: {
                          stroke: result.atsScore > 70 ? "#22c55e" : "#f59e0b",
                          strokeLinecap: "round"
                        },
                        text: { fill: "#f8fafc", fontSize: "17px", fontWeight: 700 },
                        trail: { stroke: "#334155" }
                      }}
                    />
                  </div>

                  <button onClick={downloadReport} className="dashboard-btn-secondary mt-6">
                    Download ATS Report
                  </button>

                  <h3 className="mt-7 font-semibold">Skills</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.skills.map((skill, i) => (
                      <span key={i} className="dashboard-tag dashboard-tag--ok">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <h3 className="mt-6 font-semibold">Missing Skills</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.missingSkills.map((skill, i) => (
                      <span key={i} className="dashboard-tag dashboard-tag--miss">
                        {skill}
                      </span>
                    ))}
                  </div>

                  {strengthMeter && (
                    <div className="mt-8">
                      <h3 className="font-semibold">Resume Strength Meter</h3>
                      <div className="mt-4 space-y-4">
                        {strengthMetrics.map(({ key, label, color }) => {
                          const value = strengthMeter[key] ?? 0;

                          return (
                            <div key={key}>
                              <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="text-slate-200">{label}</span>
                                <span className="font-semibold text-slate-100">{value}%</span>
                              </div>
                              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-700/70">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>

          <div className="relative mt-8">
            <div className={isUnlocked ? "" : "blur-sm opacity-60 pointer-events-none"}>
              <section className={glassCardClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">AI Resume Suggestions</h2>
                  <button
                    onClick={getSuggestions}
                    className="dashboard-btn-secondary"
                    disabled={suggestionLoading || !isUnlocked}
                  >
                    {suggestionLoading ? "Generating..." : "Generate Suggestions"}
                  </button>
                </div>

                {suggestionError && (
                  <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {suggestionError}
                  </p>
                )}

                {activeSuggestions.length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {activeSuggestions.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
                        <p className="inline-flex items-start gap-2 text-sm text-amber-100">
                          <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-300" />
                          <span>{item}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-300">
                    No suggestions stored yet for this resume. Click Generate Suggestions.
                  </p>
                )}

                {activeSuggestionProgress?.items?.length > 0 && (
                  <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-cyan-100">Progress On Previous Suggestions</h3>
                        <p className="mt-1 text-xs text-slate-300">
                          Addressed {activeSuggestionProgress.addressedCount} of {activeSuggestionProgress.totalSuggestions} suggestions from your previous resume.
                        </p>
                      </div>
                      <div className="rounded-full border border-cyan-300/25 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-cyan-200">
                        Pending: {activeSuggestionProgress.pendingCount}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {activeSuggestionProgress.items.map((item, index) => {
                        const isAddressed = item.status === "addressed";

                        return (
                          <div
                            key={`${item.suggestion}-${index}`}
                            className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
                              isAddressed
                                ? "border-emerald-400/30 bg-emerald-500/10"
                                : "border-amber-400/30 bg-amber-500/10"
                            }`}
                          >
                            <p className="max-w-2xl text-sm text-slate-100">{item.suggestion}</p>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isAddressed
                                  ? "bg-emerald-500/20 text-emerald-200"
                                  : "bg-amber-500/20 text-amber-200"
                              }`}
                            >
                              {isAddressed ? "Worked On" : "Still Pending"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section id="dashboard-summary-section" className={`${glassCardClass} mt-8 scroll-mt-24`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">AI Resume Summary</h2>
                  <button
                    onClick={generateSummary}
                    className="dashboard-btn-secondary"
                    disabled={summaryLoading || !isUnlocked}
                  >
                    {summaryLoading ? "Generating..." : "Generate Summary"}
                  </button>
                </div>

                {summaryError && (
                  <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {summaryError}
                  </p>
                )}

                {resumeSummary.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-cyan-300/20 bg-slate-900/45 p-4">
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-100">
                      {resumeSummary.map((point, index) => (
                        <li key={`${point}-${index}`}>• {point}</li>
                      ))}
                    </ul>

                    {summaryCertifications.length > 0 && (
                      <>
                        <h3 className="mb-3 mt-6 text-lg font-semibold">
                          Certifications
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          {summaryCertifications.map((cert, index) => (
                            <motion.div
                              key={`${cert}-${index}`}
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.95 }}
                              className="rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-md"
                            >
                              <p className="text-sm text-gray-200">
                                {cert}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-300">
                    Click Generate Summary to create a professional summary from your resume.
                  </p>
                )}
              </section>

              <section className={`${glassCardClass} mt-8`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">AI Career Suggestions</h2>
                  <button
                    onClick={generateCareerSuggestions}
                    className="dashboard-btn-secondary"
                    disabled={careerLoading || !isUnlocked}
                  >
                    {careerLoading ? "Generating..." : "Generate Career Suggestions"}
                  </button>
                </div>

                {careerError && (
                  <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {careerError}
                  </p>
                )}

                {careerSuggestions.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {careerSuggestions.map((career, index) => (
                      <span
                        key={`${career}-${index}`}
                        className="rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white"
                      >
                        {career}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-300">
                    Generate career suggestions based on your extracted skills.
                  </p>
                )}
              </section>

              <section className={`${glassCardClass} mt-8`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Resume Section Analyzer</h2>
                  {sectionLoading && (
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-300">
                      Analyzing...
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  Quick checklist of key resume sections.
                </p>

                {sectionError && (
                  <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {sectionError}
                  </p>
                )}

                {!sectionError && sectionAnalysis && (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {sectionChecklist.map(({ key, label }) => {
                      const exists = Boolean(sectionAnalysis[key]);

                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                            exists
                              ? "border-emerald-400/35 bg-emerald-500/10"
                              : "border-rose-400/35 bg-rose-500/10"
                          }`}
                        >
                          <span className="text-sm font-medium text-slate-100">{label}</span>
                          <span
                            className={`inline-flex items-center gap-2 text-sm font-semibold ${
                              exists ? "text-emerald-300" : "text-rose-300"
                            }`}
                          >
                            {exists ? (
                              <>
                                <FaCheckCircle />
                                Present
                              </>
                            ) : (
                              <>
                                <FaExclamationTriangle />
                                Missing
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {(!isUnlocked || showUnlockAnimation) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center rounded-xl bg-black/50 p-6 backdrop-blur-md">
                  <motion.button
                    type="button"
                    className="dashboard-lock-button"
                    initial={{ scale: 1 }}
                    animate={isUnlocked ? { rotate: 360, scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                    whileHover={
                      isUnlocked
                        ? undefined
                        : { y: -4, rotate: [0, -10, 10, -6, 6, 0], scale: 1.08 }
                    }
                    whileTap={isUnlocked ? undefined : { scale: 0.92, rotate: [0, -12, 12, 0] }}
                    transition={{ duration: 0.6 }}
                  >
                    {isUnlocked ? (
                      <Unlock size={40} className="text-white" />
                    ) : (
                      <Lock size={40} className="text-white" />
                    )}
                  </motion.button>

                  {!isUnlocked && (
                    <p className="mt-2 text-center text-sm text-gray-300">
                      Upload and analyze a resume to unlock AI features
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.main>
      </div>
    </div>
  );
}

export default Dashboard;
