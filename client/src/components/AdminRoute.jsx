import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import API from "../services/api";

function AdminRoute({ children }) {
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifyAdmin = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setStatus("unauthenticated");
        return;
      }

      try {
        const decoded = jwtDecode(token);
        const res = await API.get(`/auth/profile/${decoded.id}`);

        setStatus(res.data?.role === "admin" ? "authorized" : "forbidden");
      } catch (error) {
        console.error("Admin route check failed:", error);
        const httpStatus = error?.response?.status;

        if (httpStatus === 401) {
          localStorage.removeItem("token");
          setStatus("unauthenticated");
          return;
        }

        if (httpStatus === 403) {
          setStatus("forbidden");
          return;
        }

        setErrorMessage(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Unable to reach the server. Please make sure the backend is running and try again."
        );
        setStatus("error");
      }
    };

    verifyAdmin();
  }, []);

  if (status === "loading") {
    return (
      <div className="admin-route-shell flex min-h-screen items-center justify-center px-6 text-center text-white">
        <div className="admin-panel-glow admin-panel-glow--one" />
        <div className="admin-panel-glow admin-panel-glow--two" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">ResumeIQ</p>
          <h1 className="mt-3 text-2xl font-semibold">Checking admin access</h1>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="admin-route-shell flex min-h-screen items-center justify-center px-6 text-center text-white">
        <div className="admin-panel-glow admin-panel-glow--one" />
        <div className="admin-panel-glow admin-panel-glow--two" />
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">ResumeIQ</p>
          <h1 className="mt-3 text-2xl font-semibold">Admin panel unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">{errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 w-full rounded-2xl bg-cyan-400/15 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "forbidden") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;
