import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  CircleDot,
  CreditCard,
  Crown,
  Landmark,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import DashboardSidebar from "../components/DashboardSidebar";

const PRICING_PLANS = [
  {
    key: "free",
    title: "Free",
    price: 0,
    period: "month",
    description: "Best for getting started with ResumeIQ ATS checks and uploads.",
    badge: "",
    buttonLabel: "Current Plan",
    accent: "from-slate-200/20 via-slate-300/10 to-transparent",
    available: [
      "3 Resume Analysis",
      "ATS Score",
      "Resume Upload"
    ],
    locked: [
      "AI Resume Summary",
      "Career Suggestions",
      "Job Match Analyzer"
    ]
  },
  {
    key: "pro",
    title: "Pro",
    price: 199,
    period: "month",
    description: "Unlock the most useful AI guidance tools for faster resume improvement.",
    badge: "Most Popular",
    buttonLabel: "Upgrade to Pro",
    recommended: true,
    accent: "from-emerald-300/35 via-cyan-300/18 to-transparent",
    available: [
      "Unlimited Resume Analysis",
      "AI Resume Summary",
      "Career Suggestions",
      "Resume Section Analyzer"
    ],
    locked: [
      "AI Resume Rewrite",
      "Priority AI processing"
    ]
  },
  {
    key: "premium",
    title: "Premium",
    price: 399,
    period: "month",
    description: "Get the full ResumeIQ experience with premium AI speed and job targeting.",
    badge: "Elite",
    buttonLabel: "Upgrade to Premium",
    accent: "from-amber-200/30 via-cyan-300/14 to-transparent",
    available: [
      "Everything in Pro",
      "AI Resume Rewrite",
      "Job Match Analyzer",
      "Priority AI processing"
    ],
    locked: []
  }
];

const PAYMENT_METHODS = [
  {
    key: "card",
    label: "Credit / Debit Card",
    meta: "Visa, Mastercard, RuPay, Amex",
    description: "Fast card checkout with international and domestic support.",
    icon: CreditCard,
    badge: "Popular"
  },
  {
    key: "upi",
    label: "UPI",
    meta: "GPay, PhonePe, Paytm, BHIM",
    description: "Instant payment through any UPI app.",
    icon: Smartphone
  },
  {
    key: "netbanking",
    label: "Net Banking",
    meta: "All major Indian banks",
    description: "Pay directly from your bank account.",
    icon: Landmark
  },
  {
    key: "wallet",
    label: "Wallets",
    meta: "Paytm, Mobikwik and more",
    description: "Use wallet balance for a faster checkout.",
    icon: Wallet
  }
];

function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const checkoutRef = useRef(null);
  const mainRef = useRef(null);
  const shouldScrollToCheckoutRef = useRef(false);

  let userId = null;
  try {
    if (token) {
      const decoded = jwtDecode(token);
      userId = decoded.id;
    }
  } catch {
    console.log("Token decode error");
  }

  const [profile, setProfile] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [selectedPlanKey, setSelectedPlanKey] = useState(() => {
    const requestedPlan = location.state?.plan;
    return requestedPlan === "pro" || requestedPlan === "premium" ? requestedPlan : "";
  });
  const [selectedMethod, setSelectedMethod] = useState("card");
  const [toast, setToast] = useState({
    message: "",
    type: "info"
  });

  useEffect(() => {
    if (!token || !userId) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await API.get(`/auth/profile/${userId}`);
        setProfile(res.data || null);
      } catch (error) {
        console.error("Billing profile error:", error);
        setToast({
          message: "Unable to load billing details right now.",
          type: "error"
        });
      }
    };

    fetchProfile();
  }, [navigate, token, userId]);

  const currentPlan = profile?.plan || "free";
  const selectedPlan = useMemo(
    () => PRICING_PLANS.find((plan) => plan.key === selectedPlanKey) || null,
    [selectedPlanKey]
  );
  const selectedMethodData = useMemo(
    () => PAYMENT_METHODS.find((method) => method.key === selectedMethod) || PAYMENT_METHODS[0],
    [selectedMethod]
  );

  const currentPlanLabel = useMemo(() => {
    return PRICING_PLANS.find((plan) => plan.key === currentPlan)?.title || "Free";
  }, [currentPlan]);

  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto"
    });

    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto"
      });
    }
  }, [location.key]);

  useEffect(() => {
    if (selectedPlanKey && checkoutRef.current && shouldScrollToCheckoutRef.current) {
      checkoutRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      shouldScrollToCheckoutRef.current = false;
    }
  }, [selectedPlanKey]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const verifyPayment = async (paymentResponse, plan) => {
    const response = await API.post("/payment/verify-payment", {
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_signature: paymentResponse.razorpay_signature,
      plan
    });

    if (response.data?.subscription) {
      setProfile((prev) => ({
        ...(prev || {}),
        ...response.data.subscription
      }));
    }

    setToast({
      message: "Plan upgraded successfully",
      type: "success"
    });

    window.setTimeout(() => {
      navigate("/dashboard");
    }, 1200);
  };

  const openCheckout = (plan) => {
    shouldScrollToCheckoutRef.current = true;
    setSelectedPlanKey(plan);
    setSelectedMethod("card");
    setToast({
      message: "",
      type: "info"
    });
  };

  const handleUpgrade = async (plan) => {
    try {
      setLoadingPlan(plan);
      setToast({
        message: "",
        type: "info"
      });

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is not loaded");
      }

      const response = await API.post("/payment/create-order", { plan });
      const order = response.data?.order;
      const key = import.meta.env.VITE_RAZORPAY_KEY || response.data?.keyId;

      if (!order?.id || !key) {
        throw new Error("Unable to initialize payment");
      }

      const options = {
        key,
        amount: order.amount,
        currency: "INR",
        name: "ResumeIQ",
        description: "Subscription Upgrade",
        order_id: order.id,
        image: "/image1.png",
        handler: async function onSuccess(paymentResponse) {
          try {
            await verifyPayment(paymentResponse, plan);
          } catch (error) {
            console.error("Payment verification error:", error);
            setToast({
              message:
                error?.response?.data?.error ||
                "Payment was captured, but verification failed. Please contact support.",
              type: "error"
            });
          } finally {
            setLoadingPlan("");
          }
        },
        modal: {
          ondismiss: () => setLoadingPlan("")
        },
        prefill: {
          name: profile?.name || "",
          email: profile?.email || ""
        },
        theme: {
          color: "#22c55e"
        }
      };

      new window.Razorpay(options).open();
    } catch (error) {
      console.error("Billing payment error:", error);
      setToast({
        message: error?.response?.data?.error || error.message || "Unable to start payment",
        type: "error"
      });
      setLoadingPlan("");
    }
  };

  return (
    <div className="dashboard-shell min-h-screen text-white">
      <div className="dashboard-glow dashboard-glow--one" />
      <div className="dashboard-glow dashboard-glow--two" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_24%)]" />

      <div className="relative z-10 flex min-h-screen">
        <DashboardSidebar
          activeItem="billing"
          navigate={navigate}
          onLogout={handleLogout}
          userId={userId}
        />

        <Motion.main
          ref={mainRef}
          className="flex-1 overflow-y-auto px-6 pb-6 pt-10 md:px-8 md:pb-8 md:pt-12 lg:px-10 lg:pb-10 lg:pt-12"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mx-auto max-w-7xl">
            <Motion.section
              className="rounded-[34px] border border-white/10 bg-white/[0.045] px-6 py-10 text-center shadow-[0_30px_90px_rgba(2,8,23,0.42)] backdrop-blur-xl md:px-10"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.4 }}
            >
              <div className="mx-auto max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                  <Sparkles size={14} />
                  ResumeIQ Billing
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
                  Choose Your Plan
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
                  Upgrade your ResumeIQ plan to unlock advanced AI features.
                </p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200">
                  <Crown size={16} className="text-cyan-300" />
                  Current plan: {currentPlanLabel}
                </div>
              </div>
            </Motion.section>

            {toast.message && (
              <Motion.div
                className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
                  toast.type === "success"
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-400/25 bg-rose-500/10 text-rose-100"
                }`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {toast.message}
              </Motion.div>
            )}

            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              {PRICING_PLANS.map((plan, index) => {
                const isCurrent = currentPlan === plan.key;
                const isPremium = plan.key === "premium";
                const isPro = plan.key === "pro";

                return (
                  <Motion.article
                    key={plan.key}
                    className={`group relative overflow-hidden rounded-[28px] border p-8 backdrop-blur-xl transition-all duration-200 ${
                      isPremium
                        ? "border-amber-200/20 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(9,16,34,0.98))] shadow-[0_28px_90px_rgba(245,158,11,0.12)]"
                        : "border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(15,23,42,0.32)]"
                    } ${
                      isPro
                        ? "border-cyan-300/35 shadow-[0_25px_80px_rgba(14,165,233,0.18)]"
                        : ""
                    }`}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.06, duration: 0.24, ease: "easeOut" }}
                    whileHover={{ scale: 1.03, y: -6 }}
                    whileTap={{ scale: 1.01 }}
                  >
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${plan.accent}`} />
                    {isPremium && (
                      <>
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.08),transparent_24%)]" />
                        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-amber-200/18" />
                      </>
                    )}
                    {isPro && (
                      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-cyan-300/25" />
                    )}

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${
                            isPremium ? "text-amber-100/80" : "text-slate-400"
                          }`}>
                            {plan.title}
                          </p>
                          {plan.badge && (
                            <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              isPremium
                                ? "bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-200 text-slate-950 shadow-[0_10px_24px_rgba(251,191,36,0.22)]"
                                : "bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950"
                            }`}>
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        {isCurrent && (
                          <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-8">
                        <p className={`text-5xl font-black tracking-tight ${isPremium ? "text-amber-50" : "text-white"}`}>
                          ₹{plan.price}
                          <span className={`ml-2 text-lg font-semibold ${isPremium ? "text-amber-100/65" : "text-slate-400"}`}>
                            / {plan.period}
                          </span>
                        </p>
                        <p className={`mt-4 min-h-[56px] text-sm leading-7 ${isPremium ? "text-slate-200" : "text-slate-300"}`}>
                          {plan.description}
                        </p>
                      </div>

                      <div className="mt-8">
                        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isPremium ? "text-amber-100/45" : "text-slate-500"}`}>
                          Included
                        </p>
                        <div className="mt-4 space-y-3">
                          {plan.available.map((feature) => (
                            <div key={feature} className={`flex items-center gap-3 text-sm ${isPremium ? "text-amber-50" : "text-slate-100"}`}>
                              <Check size={17} className={`shrink-0 ${isPremium ? "text-amber-200" : "text-emerald-300"}`} />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {plan.locked.length > 0 && (
                        <div className="mt-8 border-t border-white/10 pt-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Locked
                          </p>
                          <div className="mt-4 space-y-3">
                            {plan.locked.map((feature) => (
                              <div key={feature} className="flex items-center gap-3 text-sm text-slate-400">
                                <X size={17} className="shrink-0 text-rose-300" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => !isCurrent && plan.key !== "free" && openCheckout(plan.key)}
                        disabled={plan.key === "free" || isCurrent || Boolean(loadingPlan)}
                        className={`mt-10 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                          isPremium
                            ? "bg-[linear-gradient(135deg,#fde68a_0%,#fbbf24_32%,#67e8f9_100%)] text-slate-950 shadow-[0_18px_38px_rgba(251,191,36,0.22)] hover:shadow-[0_24px_44px_rgba(251,191,36,0.28)]"
                            : isPro
                            ? "bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 text-white shadow-[0_14px_34px_rgba(14,165,233,0.28)] hover:shadow-[0_20px_40px_rgba(14,165,233,0.34)]"
                            : "border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]"
                        }`}
                      >
                        {loadingPlan === plan.key ? (
                          <>
                            <LoaderCircle size={16} className="animate-spin" />
                            Processing
                          </>
                        ) : (
                          plan.key === "free" || isCurrent
                            ? "Current Plan"
                            : selectedPlanKey === plan.key
                              ? "Checkout Open"
                              : plan.buttonLabel
                        )}
                      </button>
                    </div>
                  </Motion.article>
                );
              })}
            </section>

            {selectedPlan && (
              <Motion.section
                ref={checkoutRef}
                className="mt-8 overflow-hidden rounded-[32px] border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] shadow-[0_30px_100px_rgba(15,23,42,0.45)] backdrop-blur-xl"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="grid grid-cols-1 gap-0 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative border-b border-white/10 p-6 sm:p-8 xl:border-b-0 xl:border-r">
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-emerald-300/25 via-cyan-300/12 to-transparent" />
                    <div className="relative">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
                            <Sparkles size={14} />
                            ResumeIQ Checkout
                          </div>
                          <h2 className="mt-4 text-3xl font-black tracking-tight text-white">
                            Complete your {selectedPlan.title} upgrade
                          </h2>
                          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                            Choose any payment mode you prefer. The final payment is securely handled by Razorpay,
                            while this checkout keeps the look aligned with your ResumeIQ billing theme.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedPlanKey("")}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                        >
                          Back to Plans
                        </button>
                      </div>

                      <div className="mt-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Payment Method
                        </p>

                        <div className="mt-4 space-y-3">
                          {PAYMENT_METHODS.map((method) => {
                            const Icon = method.icon;
                            const isSelected = selectedMethod === method.key;

                            return (
                              <button
                                key={method.key}
                                type="button"
                                onClick={() => setSelectedMethod(method.key)}
                                className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left transition-all duration-300 ${
                                  isSelected
                                    ? "border-emerald-300/45 bg-emerald-400/[0.08] shadow-[0_16px_34px_rgba(34,197,94,0.10)]"
                                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                                    isSelected
                                      ? "bg-emerald-400/15 text-emerald-200"
                                      : "bg-white/[0.06] text-slate-300"
                                  }`}>
                                    <Icon size={20} />
                                  </div>

                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-white">{method.label}</p>
                                      {method.badge && (
                                        <span className="rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-950">
                                          {method.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">{method.meta}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {isSelected && <CircleDot size={16} className="text-emerald-200" />}
                                  <ChevronRight size={18} className="text-slate-500" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-8 rounded-[26px] border border-white/10 bg-slate-950/35 p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white">Security and privacy</h3>
                            <p className="text-xs leading-6 text-slate-400">
                              Your card, UPI or banking details are completed inside Razorpay’s secure checkout.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative p-6 sm:p-8">
                    <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-emerald-300/10 blur-3xl" />
                    <div className="relative">
                      <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-6 shadow-[0_18px_60px_rgba(2,8,23,0.3)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                              Order Summary
                            </p>
                            <h3 className="mt-3 text-2xl font-bold text-white">{selectedPlan.title} Plan</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {selectedPlan.description}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                            Monthly
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div className="flex items-center justify-between text-sm text-slate-300">
                            <span>Plan price</span>
                            <span className="font-semibold text-white">₹{selectedPlan.price}.00</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-slate-300">
                            <span>Platform fee</span>
                            <span className="font-semibold text-emerald-200">Included</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-slate-300">
                            <span>Selected payment mode</span>
                            <span className="font-semibold text-white">{selectedMethodData.label}</span>
                          </div>
                          <div className="border-t border-dashed border-white/10 pt-4">
                            <div className="flex items-center justify-between">
                              <span className="text-base font-semibold text-slate-100">Total</span>
                              <span className="text-3xl font-black tracking-tight text-emerald-200">
                                ₹{selectedPlan.price}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                              30-day access window. Renewal is manual in the current flow.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          What you unlock today
                        </p>
                        <div className="mt-4 space-y-3">
                          {selectedPlan.available.map((feature) => (
                            <div key={feature} className="flex items-center gap-3 text-sm text-slate-100">
                              <Check size={16} className="text-emerald-300" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpgrade(selectedPlan.key)}
                        disabled={Boolean(loadingPlan)}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400 px-5 py-4 text-sm font-bold text-slate-950 shadow-[0_18px_40px_rgba(34,197,94,0.24)] transition-all duration-300 hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loadingPlan === selectedPlan.key ? (
                          <>
                            <LoaderCircle size={17} className="animate-spin" />
                            Opening Razorpay
                          </>
                        ) : (
                          <>
                            Pay Now
                            <ChevronRight size={17} />
                          </>
                        )}
                      </button>

                      <p className="mt-3 text-center text-xs text-slate-400">
                        Supports UPI, cards, wallets, net banking and other modes shown inside Razorpay checkout.
                      </p>
                    </div>
                  </div>
                </div>
              </Motion.section>
            )}

            <Motion.section
              className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.7fr]"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.35 }}
            >
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Need custom plan?
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  Contact support for enterprise pricing.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                  If you need custom usage limits, team billing, or a larger deployment for your organization,
                  we can set up a tailored ResumeIQ plan for you.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                  <Sparkles size={15} />
                  support@resumeiq.ai
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Secure Billing</h3>
                    <p className="text-sm text-slate-400">Powered by Razorpay checkout</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-sm text-slate-200">
                  <div className="flex items-center gap-3">
                    <Check size={16} className="text-emerald-300" />
                    UPI, Cards, Net Banking, Wallets
                  </div>
                  <div className="flex items-center gap-3">
                    <Check size={16} className="text-emerald-300" />
                    Signature verified on backend
                  </div>
                  <div className="flex items-center gap-3">
                    <Check size={16} className="text-emerald-300" />
                    Plan updates stored in MongoDB
                  </div>
                </div>
              </div>
            </Motion.section>
          </div>
      </Motion.main>
      </div>
    </div>
  );
}

export default Billing;
