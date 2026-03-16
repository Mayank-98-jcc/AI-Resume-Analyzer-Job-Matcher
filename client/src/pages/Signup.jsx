import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import BrandMark from "../components/BrandMark";
import { ensureGoogleIdentityInitialized, renderGoogleButton, waitForGoogleIdentity } from "../utils/googleIdentity";

function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRouteSwitching, setIsRouteSwitching] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [apiError, setApiError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [googleError, setGoogleError] = useState("");

  const googleButtonRef = useRef(null);

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });

  const nameRegex = useMemo(() => /^[A-Za-z ]+$/, []);
  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  const emailValue = email.trim();
  const emailValid = Boolean(emailValue) && emailRegex.test(emailValue);

  const validation = useMemo(() => {
    const next = {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    };

    const nameValue = name.trim();

    if (!nameValue) {
      next.name = "Name is required";
    } else if (nameValue.length < 2) {
      next.name = "Name must be at least 2 characters";
    } else if (!nameRegex.test(nameValue)) {
      next.name = "Name can contain only letters and spaces";
    }

    if (!emailValue) {
      next.email = "Email is required";
    } else if (!emailValid) {
      next.email = "Enter a valid email address";
    }

    if (!password) {
      next.password = "Password is required";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      next.password = "Password must include at least one uppercase letter";
    } else if (!/[0-9]/.test(password)) {
      next.password = "Password must include at least one number";
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      next.password = "Password must include at least one special character";
    }

    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match";
    }

    return next;
  }, [name, nameRegex, emailValue, emailValid, password, confirmPassword]);

  const isFormValid =
    !validation.name &&
    !validation.email &&
    !validation.password &&
    !validation.confirmPassword &&
    emailVerified;

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;

    const handler = async (response) => {
      try {
        setGoogleLoading(true);
        setGoogleError("");

        const res = await API.post("/auth/google", {
          credential: response.credential
        });

        localStorage.setItem("token", res.data.token);
        window.location.href = "/dashboard";
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          "Google signup failed. Make sure your OAuth client allows this site origin in Google Cloud Console.";
        setGoogleError(message);
      } finally {
        setGoogleLoading(false);
      }
    };

    globalThis.__resumeiq_gsi_onCredential = handler;

    (async () => {
      try {
        await waitForGoogleIdentity({ timeoutMs: 8000 });
        if (cancelled) return;

        ensureGoogleIdentityInitialized(clientId);

        renderGoogleButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          text: "continue_with",
          shape: "pill",
          size: "large",
          width: "320"
        });
      } catch (err) {
        if (!cancelled) {
          setGoogleError(
            "Google sign-in is not available right now. Check that your Google OAuth client allows this origin (e.g. http://localhost:5173)."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (globalThis.__resumeiq_gsi_onCredential === handler) {
        globalThis.__resumeiq_gsi_onCredential = null;
      }
    };
  }, []);

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    setEmailVerified(false);
    setShowOtpInput(false);
    setOtp("");
    setOtpMessage("");
    setOtpError("");
    setApiError("");
  };

  const handleSendOtp = async () => {
    setApiError("");
    setOtpMessage("");
    setOtpError("");

    if (!emailValid) {
      setTouched((prev) => ({ ...prev, email: true }));
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await API.post("/auth/send-otp", { email: emailValue });
      setOtpMessage(res.data?.message || "OTP sent successfully");
      setShowOtpInput(true);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.response?.data?.error || "Unable to send OTP";
      setOtpError(message);
      setShowOtpInput(false);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    setOtpMessage("");

    if (!emailValid) {
      setOtpError("Enter a valid email address first");
      return;
    }

    const otpValue = String(otp).trim();
    if (otpValue.length !== 6) {
      setOtpError("Enter the 6 digit OTP");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await API.post("/auth/verify-otp", {
        email: emailValue,
        otp: otpValue
      });
      setEmailVerified(true);
      setShowOtpInput(false);
      setOtpMessage(res.data?.message || "Email verified successfully");
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.response?.data?.error || "Invalid OTP";
      setOtpError(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setApiError("");
    setGoogleError("");

    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true
    });

    if (!emailVerified) {
      setApiError("Please verify your email before creating account");
      return;
    }

    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const res = await API.post("/auth/register", {
        name: name.trim(),
        email: emailValue,
        password
      });

      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      }
      window.location.href = "/dashboard";
    } catch (err) {
      const message =
        err?.response?.data?.message || "Registration failed. Please try again.";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchToLogin = () => {
    if (isRouteSwitching) return;
    setIsRouteSwitching(true);
    setTimeout(() => navigate("/login"), 200);
  };

  const emailInputClassName = useMemo(() => {
    if (!emailValue) return "";
    if (!emailValid) return "login-input--error";
    if (emailVerified) return "login-input--success";
    return "";
  }, [emailValue, emailValid, emailVerified]);

  return (
    <div className="login-shell min-h-screen flex items-center justify-center p-6 text-white">
      <div className="login-blob login-blob--one" />
      <div className="login-blob login-blob--two" />
      <div className="login-blob login-blob--three" />

      <div className={`login-card auth-route-card w-full max-w-md p-8 sm:p-10 ${isRouteSwitching ? "is-route-flipping" : ""}`}>
        <BrandMark compact center />

        <h2 className="text-3xl font-bold text-center tracking-tight">Create Account</h2>
        <p className="mt-2 text-center text-sm text-slate-300">
          Verify your email to continue
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleRegister} noValidate>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="Mayank Thapliyal"
              className={`login-input w-full rounded-xl px-4 py-3 ${
                touched.name && validation.name ? "login-input--error" : ""
              }`}
            />
            {touched.name && validation.name && (
              <p className="mt-2 text-sm text-rose-300">{validation.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="email">Email</label>
            <div className="flex gap-3">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="you@example.com"
                className={`login-input w-full rounded-xl px-4 py-3 ${emailInputClassName}`}
                disabled={emailVerified}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={!emailValid || isSendingOtp || emailVerified}
                className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingOtp ? "Sending..." : emailVerified ? "Verified" : "Send OTP"}
              </button>
            </div>

            {touched.email && validation.email && (
              <p className="mt-2 text-sm text-rose-300">{validation.email}</p>
            )}
            {emailVerified && (
              <p className="mt-2 text-sm text-emerald-200">Email verified successfully</p>
            )}
          </div>

          {showOtpInput && (
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="otp">OTP</label>
              <div className="flex gap-3">
                <input
                  id="otp"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6 digit OTP"
                  className="login-input w-full rounded-xl px-4 py-3 tracking-[0.35em]"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={String(otp).trim().length !== 6 || isVerifyingOtp}
                  className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingOtp ? "Verifying..." : "Verify"}
                </button>
              </div>
            </div>
          )}

          {(otpMessage || otpError) && (
            <p className={`rounded-lg border px-3 py-2 text-sm ${
              otpError
                ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
            }`}
            >
              {otpError || otpMessage}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password")}
                placeholder="Create a strong password"
                className={`login-input w-full rounded-xl px-4 py-3 pr-16 ${
                  touched.password && validation.password ? "login-input--error" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="login-eye absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {touched.password && validation.password && (
              <p className="mt-2 text-sm text-rose-300">{validation.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                placeholder="Re-enter your password"
                className={`login-input w-full rounded-xl px-4 py-3 pr-16 ${
                  touched.confirmPassword && validation.confirmPassword
                    ? "login-input--error"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="login-eye absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {touched.confirmPassword && validation.confirmPassword && (
              <p className="mt-2 text-sm text-rose-300">{validation.confirmPassword}</p>
            )}
          </div>

          {(apiError || googleError) && (
            <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {apiError || googleError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !emailVerified}
            className={`login-submit auth-submit-flip w-full rounded-xl px-4 py-3 font-semibold ${
              isSubmitting ? "is-loading" : ""
            }`}
          >
            {!emailVerified
              ? "Verify email to continue"
              : isSubmitting
                ? "Creating account..."
                : "Create Account"}
          </button>

          <div className="flex justify-center">
            <div ref={googleButtonRef} />
          </div>
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <p className="text-sm text-amber-200 text-center">
              Google auth is not configured. Add `VITE_GOOGLE_CLIENT_ID`.
            </p>
          )}
          {googleLoading && (
            <p className="text-sm text-slate-300 text-center">Connecting to Google...</p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <button type="button" onClick={switchToLogin} className="auth-switch-link font-semibold text-cyan-300">
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;

