import { useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";

function ResetSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  useEffect(() => {
    const id = window.setTimeout(() => {
      navigate("/login", { state: email ? { email } : undefined });
    }, 3000);
    return () => window.clearTimeout(id);
  }, [email, navigate]);

  return (
    <div className="login-shell min-h-screen flex items-center justify-center p-6 text-white">
      <div className="login-blob login-blob--one" />
      <div className="login-blob login-blob--two" />
      <div className="login-blob login-blob--three" />

      <Motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="login-card w-full max-w-md rounded-[34px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_90px_rgba(2,8,23,0.42)] backdrop-blur-xl sm:p-10"
      >
        <BrandMark compact center />

        <div className="mt-6 flex justify-center">
          <Motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 shadow-[0_18px_55px_rgba(16,185,129,0.18)]"
          >
            <CheckCircle2 size={32} />
          </Motion.div>
        </div>

        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Password Reset Successful
        </h1>
        <p className="mt-3 text-center text-sm text-slate-300">
          You can now login with your new password.
        </p>
        <p className="mt-2 text-center text-sm text-slate-400">
          Redirecting to login in 3 seconds…
        </p>

        <button
          type="button"
          onClick={() => navigate("/login", { state: email ? { email } : undefined })}
          className="login-submit mt-8 w-full rounded-xl px-4 py-3 font-semibold"
        >
          Go to Login
        </button>
      </Motion.div>
    </div>
  );
}

export default ResetSuccess;
