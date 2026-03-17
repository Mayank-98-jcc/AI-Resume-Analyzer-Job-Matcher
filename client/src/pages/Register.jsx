import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import BrandMark from "../components/BrandMark";
import { ensureGoogleIdentityInitialized, renderGoogleButton, waitForGoogleIdentity } from "../utils/googleIdentity";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRouteSwitching, setIsRouteSwitching] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });

  const nameRegex = useMemo(() => /^[A-Za-z ]+$/, []);
  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  const validation = useMemo(() => {
    const next = {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    };

    const nameValue = name.trim();
    const emailValue = email.trim();

    if (!nameValue) {
      next.name = "Name is required";
    } else if (nameValue.length < 2) {
      next.name = "Name must be at least 2 characters";
    } else if (!nameRegex.test(nameValue)) {
      next.name = "Name can contain only letters and spaces";
    }

    if (!emailValue) {
      next.email = "Email is required";
    } else if (!emailRegex.test(emailValue)) {
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
  }, [name, email, password, confirmPassword, nameRegex, emailRegex]);

  const isFormValid =
    !validation.name &&
    !validation.email &&
    !validation.password &&
    !validation.confirmPassword;

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("Google Client ID:", googleClientId);
    }
    if (!googleClientId) return;

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

        ensureGoogleIdentityInitialized(googleClientId);

        renderGoogleButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          text: "continue_with",
          shape: "pill",
          size: "large",
          width: "320"
        });
      } catch {
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
  }, [googleClientId]);

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
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

    if (!isFormValid) return;

    setIsSubmitting(true);

    try {
      const res = await API.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
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

  return (
    <div className="login-shell min-h-screen flex items-center justify-center p-6 text-white">
      <div className="login-blob login-blob--one" />
      <div className="login-blob login-blob--two" />
      <div className="login-blob login-blob--three" />

      <div className={`login-card auth-route-card w-full max-w-md p-8 sm:p-10 ${isRouteSwitching ? "is-route-flipping" : ""}`}>
        <BrandMark compact center />

        <h2 className="text-3xl font-bold text-center tracking-tight">Create Account</h2>
        <p className="mt-2 text-center text-sm text-slate-300">
          Build your profile and start analyzing resumes
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
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur("email")}
              placeholder="you@example.com"
              className={`login-input w-full rounded-xl px-4 py-3 ${
                email.trim()
                  ? validation.email
                    ? "login-input--error"
                    : "login-input--success"
                  : ""
              }`}
            />
            {touched.email && validation.email && (
              <p className="mt-2 text-sm text-rose-300">{validation.email}</p>
            )}
          </div>

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
            disabled={isSubmitting}
            className={`login-submit auth-submit-flip w-full rounded-xl px-4 py-3 font-semibold ${
              isSubmitting ? "is-loading" : ""
            }`}
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>

          {googleClientId ? (
            <div className="flex justify-center">
              <div ref={googleButtonRef} />
            </div>
          ) : null}
          {!googleClientId && (
            <p className="text-sm text-yellow-400 text-center">
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

export default Register;
