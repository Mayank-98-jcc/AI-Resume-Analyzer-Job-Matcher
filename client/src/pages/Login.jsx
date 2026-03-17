import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import API from "../services/api";
import BrandMark from "../components/BrandMark";
import { ensureGoogleIdentityInitialized, renderGoogleButton, waitForGoogleIdentity } from "../utils/googleIdentity";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRouteSwitching, setIsRouteSwitching] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [apiError, setApiError] = useState("");

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  const validation = useMemo(() => {
    const next = { email: "", password: "" };

    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!emailRegex.test(email.trim())) {
      next.email = "Enter a valid email address";
    }

    if (!password) {
      next.password = "Password is required";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }

    return next;
  }, [email, password, emailRegex]);

  const isFormValid = !validation.email && !validation.password;

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

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
        await redirectAfterAuth(res.data.token);
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          "Google login failed. Make sure your OAuth client allows this site origin in Google Cloud Console.";
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
  }, [googleClientId, navigate]);

  const redirectAfterAuth = async (token) => {
    const decoded = jwtDecode(token);
    const profileRes = await API.get(`/auth/profile/${decoded.id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    window.location.href = profileRes.data?.role === "admin" ? "/admin" : "/dashboard";
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setApiError("");
    setGoogleError("");
    setTouched({ email: true, password: true });

    if (!isFormValid) return;

    setIsSubmitting(true);

    try {
      const res = await API.post("/auth/login", {
        email: email.trim(),
        password
      });

      localStorage.setItem("token", res.data.token);
      await redirectAfterAuth(res.data.token);
    } catch (err) {
      const message = err?.response?.data?.message || "Login failed. Check your credentials.";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchToRegister = () => {
    if (isRouteSwitching) return;
    setIsRouteSwitching(true);
    setTimeout(() => navigate("/register"), 200);
  };

  const goToForgot = () => {
    navigate("/forgot-password", {
      state: {
        email: email.trim()
      }
    });
  };

  return (
    <div className="login-shell min-h-screen flex items-center justify-center p-6 text-white">
      <div className="login-blob login-blob--one" />
      <div className="login-blob login-blob--two" />
      <div className="login-blob login-blob--three" />

      <div className={`login-card auth-route-card w-full max-w-md p-8 sm:p-10 ${isRouteSwitching ? "is-route-flipping" : ""}`}>
        <BrandMark compact center />

        <h2 className="text-3xl font-bold text-center tracking-tight">Welcome Back</h2>
        <p className="mt-2 text-center text-sm text-slate-300">Sign in to continue to your dashboard</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate>
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
                touched.email && validation.email ? "login-input--error" : ""
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
                placeholder="Enter password"
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

            <button type="button" className="forgot-link mt-2" onClick={goToForgot}>
              Forgot password?
            </button>
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
            {isSubmitting ? "Signing in..." : "Sign In"}
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
          New here?{" "}
          <button type="button" onClick={switchToRegister} className="auth-switch-link font-semibold text-cyan-300">
            Create account
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
