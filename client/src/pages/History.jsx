import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import DashboardSidebar from "../components/DashboardSidebar";

function History() {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const glassCardClass =
    "rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-xl transition-all hover:shadow-2xl";

  const formattedHistory = useMemo(
    () =>
      history.map((item) => ({
        ...item,
        formattedDate: new Date(item.uploadedAt).toLocaleDateString()
      })),
    [history]
  );

  useEffect(() => {
    const getHistory = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setError("");
        const res = await API.get(`/resume/history/${userId}`);
        setHistory(res.data || []);
      } catch (fetchError) {
        console.error("History error:", fetchError);
        setError("Unable to load history right now.");
      } finally {
        setLoading(false);
      }
    };

    getHistory();
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="dashboard-shell min-h-screen text-white">
      <div className="dashboard-glow dashboard-glow--one" />
      <div className="dashboard-glow dashboard-glow--two" />

      <div className="relative z-10 flex min-h-screen">
        <DashboardSidebar
          activeItem="history"
          navigate={navigate}
          onLogout={handleLogout}
          userId={userId}
        />

        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto">
          <h1 className="text-3xl font-bold tracking-tight">
            Resume History
          </h1>

          <section className={`${glassCardClass} mt-8`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">All Uploaded Resumes</h2>
              <p className="text-sm text-slate-300">{formattedHistory.length} records</p>
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-800/90 text-slate-200">
                  <tr>
                    <th className="dashboard-th">File Name</th>
                    <th className="dashboard-th">ATS Score</th>
                    <th className="dashboard-th">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="dashboard-td text-center text-slate-300">
                        Loading history...
                      </td>
                    </tr>
                  ) : formattedHistory.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="dashboard-td text-center text-slate-300">
                        No resumes uploaded yet
                      </td>
                    </tr>
                  ) : (
                    formattedHistory.map((item) => (
                      <tr key={item._id} className="border-t border-slate-700/40">
                        <td className="dashboard-td">{item.fileName}</td>
                        <td className="dashboard-td">{item.atsScore}</td>
                        <td className="dashboard-td">{item.formattedDate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default History;
