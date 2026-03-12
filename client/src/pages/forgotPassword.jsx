import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import BrandMark from "../components/BrandMark";

function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
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

  const validation = useMemo(() => {
    const next = { email: "", newPassword: "", confirmPassword: "" };

    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!emailRegex.test(email.trim())) {
      next.email = "Enter a valid email address";
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
  }, [email, newPassword, confirmPassword, step, emailRegex]);

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
        await API.post("/auth/check-email", { email: email.trim() });
        setStep("password");
      } catch (err) {
        const msg = err?.response?.data?.message || "No email id found";
        setError(msg);
      } finally {
        setIsChecking(false);
      }
      return;
    }

    if (validation.newPassword || validation.confirmPassword) {
      setError(validation.newPassword || validation.confirmPassword);
      return;
    }

    setIsSubmitting(true);
    try {
      await API.post("/auth/forgot-password", {
        email: email.trim(),
        newPassword
      });
      setMessage("Password changed successfully");

      setIsRouteSwitching(true);
      setTimeout(() => {
        navigate("/login", { state: { email: email.trim() } });
      }, 200);
    } catch (err) {
      const msg = err?.response?.data?.message || "Could not update password";
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
            ? "Enter your registered email to continue"
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
              readOnly={step === "password"}
              className={`login-input w-full rounded-xl px-4 py-3 ${step === "password" ? "opacity-80" : ""}`}
            />
          </div>

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
                ? "Checking..."
                : "Change Password"
              : isSubmitting
                ? "Updating..."
                : "Confirm"}
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
