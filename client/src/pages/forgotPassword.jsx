import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import BrandMark from "../components/BrandMark";

function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState("email");
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRouteSwitching, setIsRouteSwitching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  const passwordStrength = useMemo(() => {
    const value = String(newPassword || "");
    const hasNumber = /\d/.test(value);
    const hasUppercase = /[A-Z]/.test(value);
    const hasSpecial = /[^A-Za-z0-9]/.test(value);

    if (value.length < 6) return { level: "weak", label: "Weak", score: 1 };
    if (value.length >= 10 && hasUppercase && hasNumber && hasSpecial) {
      return { level: "strong", label: "Strong", score: 3 };
    }
    if (value.length >= 8 && hasNumber) return { level: "medium", label: "Medium", score: 2 };
    return { level: "weak", label: "Weak", score: 1 };
  }, [newPassword]);

  const validation = useMemo(() => {
    const next = { email: "", otp: "", newPassword: "", confirmPassword: "" };

    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!emailRegex.test(email.trim())) {
      next.email = "Enter a valid email address";
    }

    if (step === "otp") {
      const normalizedOtp = String(otp || "").trim();
      if (!normalizedOtp) {
        next.otp = "OTP is required";
      } else if (!/^\d{6}$/.test(normalizedOtp)) {
        next.otp = "OTP must be 6 digits";
      }
    }

    if (step === "password") {
      if (!newPassword) {
        next.newPassword = "New password is required";
      } else if (newPassword.length < 8) {
        next.newPassword = "Password must be at least 8 characters";
      }

      if (!confirmPassword) {
        next.confirmPassword = "Please confirm your password";
      } else if (confirmPassword !== newPassword) {
        next.confirmPassword = "Passwords do not match";
      }
    }

    return next;
  }, [email, otp, newPassword, confirmPassword, step, emailRegex]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (validation.email) {
      setError(validation.email);
      return;
    }

    if (step === "email") {
      setIsChecking(true);
      try {
        await API.post("/auth/forgot-password", { email: email.trim() });
        setMessage("OTP sent to your email. It’s valid for 10 minutes.");
        setStep("otp");
      } catch (err) {
        const msg = err?.response?.data?.message || err?.response?.data?.error || "Unable to send OTP";
        setError(msg);
      } finally {
        setIsChecking(false);
      }
      return;
    }

    if (step === "otp") {
      if (validation.otp) {
        setError(validation.otp);
        return;
      }

      setIsSubmitting(true);
      try {
        await API.post("/auth/verify-otp", {
          email: email.trim(),
          otp: String(otp).trim()
        });
        setMessage("OTP verified. Please set your new password.");
        setStep("password");
      } catch (err) {
        const msg = err?.response?.data?.message || err?.response?.data?.error || "Invalid OTP";
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (validation.newPassword || validation.confirmPassword) {
      setError(validation.newPassword || validation.confirmPassword);
      return;
    }

    setIsSubmitting(true);
    try {
      await API.post("/auth/reset-password", {
        email: email.trim(),
        newPassword
      });
      setMessage("Password reset successfully");

      setIsRouteSwitching(true);
      setTimeout(() => {
        navigate("/reset-success", { state: { email: email.trim() } });
      }, 250);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Could not update password";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const backToLogin = () => {
    if (isRouteSwitching) return;
    setIsRouteSwitching(true);
    setTimeout(() => navigate("/login", { state: { email: email.trim() } }), 200);
  };

  return (
    <div className="login-shell min-h-screen flex items-center justify-center p-6 text-white">
      <div className="login-blob login-blob--one" />
      <div className="login-blob login-blob--two" />
      <div className="login-blob login-blob--three" />

      <div className={`login-card auth-route-card w-full max-w-md p-8 sm:p-10 ${isRouteSwitching ? "is-route-flipping" : ""}`}>
        <BrandMark compact center />

        <h2 className="text-3xl font-bold text-center tracking-tight">Forgot Password</h2>
        <p className="mt-2 text-center text-sm text-slate-300">
          {step === "email"
            ? "Enter your registered email to receive an OTP"
            : step === "otp"
              ? "Enter the 6-digit OTP sent to your email"
              : "Set your new password and confirm"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="forgotEmail">Email</label>
            <input
              id="forgotEmail"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={step !== "email"}
              className={`login-input w-full rounded-xl px-4 py-3 ${step !== "email" ? "opacity-80" : ""}`}
            />
          </div>

          {step === "otp" && (
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="forgotOtp">OTP</label>
              <input
                id="forgotOtp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                className="login-input w-full rounded-xl px-4 py-3 tracking-[0.35em]"
              />

              <button
                type="button"
                disabled={isChecking}
                onClick={async () => {
                  setError("");
                  setMessage("");
                  if (validation.email) {
                    setError(validation.email);
                    return;
                  }
                  setIsChecking(true);
                  try {
                    await API.post("/auth/forgot-password", { email: email.trim() });
                    setMessage("OTP resent. It’s valid for 10 minutes.");
                  } catch (err) {
                    setError(err?.response?.data?.message || err?.response?.data?.error || "Unable to resend OTP");
                  } finally {
                    setIsChecking(false);
                  }
                }}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                {isChecking ? "Resending..." : "Resend OTP"}
              </button>
            </div>
          )}

          {step === "password" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="newPassword">New Password</label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="login-input w-full rounded-xl px-4 py-3 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="login-eye absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Password strength
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        passwordStrength.level === "strong"
                          ? "text-emerald-200"
                          : passwordStrength.level === "medium"
                            ? "text-amber-200"
                            : "text-rose-200"
                      }`}
                    >
                      {passwordStrength.label}
                    </p>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className={`h-2 rounded-full ${passwordStrength.score >= 1 ? "bg-rose-400/80" : "bg-white/10"}`} />
                    <div className={`h-2 rounded-full ${passwordStrength.score >= 2 ? "bg-amber-300/80" : "bg-white/10"}`} />
                    <div className={`h-2 rounded-full ${passwordStrength.score >= 3 ? "bg-emerald-300/80" : "bg-white/10"}`} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="login-input w-full rounded-xl px-4 py-3 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="login-eye absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={step === "email" ? isChecking : isSubmitting}
            className="login-submit auth-submit-flip w-full rounded-xl px-4 py-3 font-semibold"
          >
            {step === "email"
              ? isChecking
                ? "Sending OTP..."
                : "Send OTP"
              : step === "otp"
                ? isSubmitting
                  ? "Verifying..."
                  : "Verify OTP"
                : isSubmitting
                  ? "Updating..."
                  : "Reset Password"}
          </button>

          <button
            type="button"
            className="auth-back-btn w-full rounded-xl px-4 py-3 font-semibold"
            onClick={backToLogin}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
