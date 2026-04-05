import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  CircleDot,
  CreditCard,
  Crown,
  CalendarDays,
  Landmark,
  LoaderCircle,
  Receipt,
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
  const [billingData, setBillingData] = useState(null);
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
        const [profileRes, billingRes] = await Promise.all([
          API.get(`/auth/profile/${userId}`),
          API.get("/billing/history")
        ]);
        setProfile(profileRes.data || null);
        setBillingData(billingRes.data || null);
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
  const paymentHistory = billingData?.paymentHistory || [];
  const nextBillingDate = billingData?.nextBillingDate || profile?.subscriptionExpiry || null;
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
      const scrollContainer = mainRef.current;
      const topOffset = 28;

      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = checkoutRef.current.getBoundingClientRect();
        const nextTop =
          scrollContainer.scrollTop + targetRect.top - containerRect.top - topOffset;

        scrollContainer.scrollTo({
          top: Math.max(nextTop, 0),
          behavior: "smooth"
        });
      } else {
        window.scrollTo({
          top: Math.max(checkoutRef.current.offsetTop - topOffset, 0),
          behavior: "smooth"
        });
      }

      shouldScrollToCheckoutRef.current = false;
    }
  }, [selectedPlanKey]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const verifyPayment = async (paymentResponse, plan) => {
    const response = await API.post("/billing/verify-payment", {
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

    setBillingData(response.data || null);

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

      const response = await API.post("/billing/create-order", { plan });
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

  const handleDowngrade = async () => {
    try {
      setLoadingPlan("free");
      setToast({
        message: "",
        type: "info"
      });

      const response = await API.post("/billing/upgrade", {
        plan: "free"
      });

      if (response.data?.subscription) {
        setProfile((prev) => ({
          ...(prev || {}),
          ...response.data.subscription
        }));
      }

      setBillingData(response.data || null);
      setSelectedPlanKey("");
      setToast({
        message: "Plan downgraded to Free",
        type: "success"
      });
    } catch (error) {
      setToast({
        message: error?.response?.data?.error || "Unable to downgrade plan",
        type: "error"
      });
    } finally {
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
              className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[radial-gradient(circle_at_left,rgba(46,144,255,0.16),transparent_28%),radial-gradient(circle_at_right,rgba(168,85,247,0.18),transparent_30%),linear-gradient(180deg,rgba(15,22,56,0.94),rgba(18,20,62,0.98))] px-6 py-8 text-center shadow-[0_30px_100px_rgba(2,8,23,0.42)] md:px-10 md:py-9"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.4 }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.18),transparent_1.2%),radial-gradient(circle_at_35%_40%,rgba(255,255,255,0.12),transparent_1%),radial-gradient(circle_at_62%_28%,rgba(255,255,255,0.16),transparent_1.1%),radial-gradient(circle_at_78%_38%,rgba(255,255,255,0.12),transparent_1%),radial-gradient(circle_at_88%_20%,rgba(255,255,255,0.14),transparent_1.2%)] [background-size:220px_220px]" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%,rgba(255,255,255,0.01))]" />
              <Motion.div
                className="pointer-events-none absolute inset-x-[12%] top-0 h-28 rounded-full bg-cyan-300/10 blur-3xl"
                animate={{ x: [-18, 18, -18], opacity: [0.35, 0.6, 0.35] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative mx-auto max-w-3xl">
                <Motion.div
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-xs font-semibold tracking-[0.18em] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.35 }}
                >
                  <Sparkles size={14} />
                  <span>
                    Resume
                    <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                      IQ
                    </span>{" "}
                    Billing
                  </span>
                </Motion.div>

                <Motion.h1
                  className="mt-4 text-4xl font-black tracking-tight text-white md:text-[3.65rem] md:leading-none"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.38 }}
                >
                  Choose Your Plan
                </Motion.h1>
                <Motion.p
                  className="mt-3 text-sm leading-7 text-slate-300 md:text-[1.08rem]"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24, duration: 0.38 }}
                >
                  Upgrade your ResumeIQ plan to unlock advanced AI features.
                </Motion.p>

                <Motion.div
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -3, 0] }}
                  transition={{
                    opacity: { delay: 0.3, duration: 0.3 },
                    scale: { delay: 0.3, duration: 0.3 },
                    y: { delay: 0.7, duration: 3.2, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <Crown size={16} className="text-cyan-300" />
                  Current plan: <span className="font-bold text-white">{currentPlanLabel}</span>
                </Motion.div>
                {nextBillingDate && currentPlan !== "free" && (
                  <Motion.div
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.36, duration: 0.35 }}
                  >
                    <CalendarDays size={16} />
                    Next billing date: {new Date(nextBillingDate).toLocaleDateString()}
                  </Motion.div>
                )}
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
                    className={`group relative overflow-hidden rounded-[30px] border p-8 backdrop-blur-xl transition-all duration-200 ${
                      isPremium
                        ? "border-amber-200/20 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),transparent_35%),linear-gradient(180deg,rgba(34,28,30,0.95),rgba(26,25,34,0.98))] shadow-[0_28px_90px_rgba(245,158,11,0.14)]"
                        : "border-white/10 bg-[linear-gradient(180deg,rgba(34,42,84,0.58),rgba(24,28,70,0.9))] shadow-[0_20px_70px_rgba(15,23,42,0.32)]"
                    } ${
                      isPro
                        ? "border-cyan-300/35 bg-[radial-gradient(circle_at_top,rgba(73,250,226,0.22),transparent_30%),linear-gradient(180deg,rgba(26,73,98,0.78),rgba(26,31,78,0.96))] shadow-[0_25px_90px_rgba(14,165,233,0.2)]"
                        : ""
                    }`}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.06, duration: 0.24, ease: "easeOut" }}
                    whileHover={{ scale: 1.03, y: -6 }}
                    whileTap={{ scale: 1.01 }}
                  >
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${plan.accent}`} />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_30%)]" />
                    {isPremium && (
                      <>
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.08),transparent_24%)]" />
                        <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-amber-200/18" />
                      </>
                    )}
                    {isPro && (
                      <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-cyan-300/28" />
                    )}
                    {!isPremium && !isPro && (
                      <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-white/8" />
                    )}

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`text-sm font-semibold uppercase tracking-[0.28em] ${
                            isPremium ? "text-amber-100/90" : "text-slate-300/80"
                          }`}>
                            {plan.title}
                          </p>
                          {plan.badge && (
                            <span className={`mt-4 inline-flex rounded-full px-3.5 py-1.5 text-sm font-bold ${
                              isPremium
                                ? "bg-[linear-gradient(135deg,#ffe96a,#ffd43d)] text-slate-950 shadow-[0_10px_24px_rgba(251,191,36,0.22)]"
                                : "bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950"
                            }`}>
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        {isCurrent && (
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/12 px-4 py-1.5 text-sm font-semibold text-emerald-200">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-8">
                        <div className="flex items-end gap-3">
                          <p className={`text-[4rem] font-black tracking-tight leading-none sm:text-[4.15rem] ${isPremium ? "text-amber-50" : "text-white"}`}>
                            ₹{plan.price}
                          </p>
                          <span
                            className={`pb-2 text-[1.15rem] font-semibold leading-none ${
                              isPremium ? "text-amber-100/75" : "text-slate-300"
                            }`}
                          >
                            /month
                          </span>
                        </div>
                        <p className={`mt-5 min-h-[84px] text-[1.02rem] leading-9 ${isPremium ? "text-slate-200" : "text-slate-300"}`}>
                          {plan.description}
                        </p>
                      </div>

                      <div className="mt-8">
                        <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremium ? "text-amber-100/45" : "text-slate-500"}`}>
                          Included
                        </p>
                        <div className="mt-4 space-y-3">
                          {plan.available.map((feature) => (
                            <div key={feature} className={`flex items-center gap-3 text-[1.02rem] ${isPremium ? "text-amber-50" : "text-slate-100"}`}>
                              <Check size={18} className={`shrink-0 ${isPremium ? "text-amber-200" : "text-emerald-300"}`} />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {plan.locked.length > 0 && (
                        <div className="mt-8 border-t border-white/10 pt-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Locked
                          </p>
                          <div className="mt-4 space-y-3">
                            {plan.locked.map((feature) => (
                              <div key={feature} className="flex items-center gap-3 text-[1.02rem] text-slate-400">
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
                        className={`mt-10 inline-flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-4 text-[1.02rem] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                          isPremium
                            ? "bg-[linear-gradient(135deg,#ffd955_0%,#facc15_34%,#d9f99d_100%)] text-slate-950 shadow-[0_18px_38px_rgba(251,191,36,0.22)] hover:shadow-[0_24px_44px_rgba(251,191,36,0.28)]"
                            : isPro
                            ? "bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 text-white shadow-[0_14px_34px_rgba(14,165,233,0.28)] hover:shadow-[0_20px_40px_rgba(14,165,233,0.34)]"
                            : "border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]"
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
                className="relative mt-8 overflow-hidden rounded-[36px] border border-cyan-200/10 bg-[radial-gradient(circle_at_top_right,rgba(72,187,255,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(40,255,214,0.08),transparent_22%),linear-gradient(135deg,#161b47_0%,#18153d_36%,#131a47_100%)] shadow-[0_30px_120px_rgba(2,8,23,0.48)]"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_28%)]" />
                <div className="relative grid grid-cols-1 gap-0 xl:grid-cols-[1.14fr_0.86fr]">
                  <div className="relative border-b border-white/8 p-6 sm:p-8 xl:border-b-0 xl:border-r xl:border-white/8 xl:p-10">
                    <div className="relative">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/10 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100 shadow-[0_8px_24px_rgba(34,211,238,0.08)]">
                            <Sparkles size={14} />
                            ResumeIQ Checkout
                          </div>
                          <h2 className="mt-6 text-[2.35rem] font-black tracking-tight text-white sm:text-[2.85rem] sm:leading-[1.08]">
                            Complete your {selectedPlan.title} upgrade
                          </h2>
                          <p className="mt-4 max-w-2xl text-[0.98rem] leading-8 text-slate-200/90">
                            Choose any payment mode you prefer to complete your {selectedPlan.title} Plan upgrade.
                          </p>
                          <p className="mt-1 max-w-2xl text-[0.98rem] leading-8 text-slate-300/85">
                            Your payment will be securely processed by Razorpay.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedPlanKey("")}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
                        >
                          Back to Plans
                        </button>
                      </div>

                      <div className="mt-10">
                        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-400/75">
                          Payment Method
                        </p>

                        <div className="mt-5 space-y-4">
                          {PAYMENT_METHODS.map((method) => {
                            const Icon = method.icon;
                            const isSelected = selectedMethod === method.key;

                            return (
                              <button
                                key={method.key}
                                type="button"
                                onClick={() => setSelectedMethod(method.key)}
                                className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${
                                  isSelected
                                    ? "border-cyan-300/55 bg-[linear-gradient(90deg,rgba(94,234,212,0.14),rgba(56,189,248,0.08))] shadow-[0_18px_38px_rgba(45,212,191,0.08)]"
                                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${
                                    isSelected
                                      ? "bg-cyan-300/14 text-cyan-100"
                                      : "bg-white/[0.05] text-slate-300"
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
                                    <p className="mt-1 text-sm text-slate-400">{method.meta}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {isSelected ? (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-200 text-cyan-100">
                                      <CircleDot size={12} />
                                    </span>
                                  ) : null}
                                  <ChevronRight size={18} className="text-slate-500" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,22,58,0.94),rgba(16,20,52,0.98))] px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_40px_rgba(2,8,23,0.22)]">
                        <div className="flex items-start gap-5">
                          <div className="mt-1 flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-[26px] bg-[linear-gradient(180deg,rgba(36,51,103,0.95),rgba(20,30,72,0.98))] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <ShieldCheck size={34} strokeWidth={2.1} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-white">Security &amp; privacy</h3>
                            <p className="mt-2 text-[0.98rem] leading-8 text-slate-300">
                              Supports Visa, Mastercard, RuPay, Amex, UPI, cards, wallets, and net banking
                              <span className="ml-2 text-cyan-200">→</span>
                            </p>
                            <div className="mt-5 flex flex-wrap items-center gap-4 text-lg font-semibold text-slate-200/95">
                              <span className="text-[1.02rem] font-black italic tracking-[-0.04em] text-[#2E86FF]">VISA</span>
                              <span className="text-white/20">|</span>
                              <span className="flex items-center gap-2">
                                <span className="h-8 w-8 rounded-full bg-[#EB001B] opacity-95" />
                                <span className="-ml-4 h-8 w-8 rounded-full bg-[#F79E1B] opacity-95" />
                              </span>
                              <span className="text-white/20">|</span>
                              <span className="text-[0.98rem] font-semibold text-slate-200">RuPay</span>
                              <span className="text-white/20">|</span>
                              <span className="text-[1.02rem] font-semibold tracking-[-0.02em] text-slate-200">Amex</span>
                              <span className="rounded-[4px] bg-[#1F57D6] px-2 py-1 text-[0.72rem] font-bold tracking-[0.06em] text-white">
                                AUTOPAY
                              </span>
                              <span className="rounded-[4px] bg-[#1E88D9] px-2.5 py-1 text-[0.82rem] font-bold text-white">
                                BHIM
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative p-6 sm:p-8 xl:p-8">
                    <div className="relative h-full rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,51,0.8),rgba(10,15,42,0.92))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-7">
                      <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-cyan-200/5" />
                      <div className="relative">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              Order Summary
                            </p>
                            <h3 className="mt-4 text-[1.85rem] font-bold leading-none text-white">{selectedPlan.title} Plan</h3>
                            <p className="mt-4 max-w-md text-[0.98rem] leading-8 text-slate-300">
                              {selectedPlan.description}
                            </p>
                          </div>
                          <div className="rounded-full border border-cyan-200/12 bg-cyan-300/8 px-4 py-2 text-sm font-semibold text-emerald-100">
                            Monthly
                          </div>
                        </div>

                        <div className="mt-6 border-t border-white/10 pt-5">
                          <div className="space-y-5">
                            <div className="flex items-center justify-between text-sm text-slate-300">
                            <span>Plan price</span>
                            <span className="font-semibold text-white">₹{selectedPlan.price}.00</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-300">
                              <span>Platform fee</span>
                              <span className="font-semibold text-slate-100">Included</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-300">
                              <span>Selected payment mode</span>
                              <span className="font-semibold text-white">{selectedMethodData.label}</span>
                            </div>
                          </div>
                          <div className="mt-6 border-t border-white/10 pt-5">
                            <div className="flex items-center justify-between">
                              <span className="text-[1.05rem] font-semibold text-white">Total</span>
                              <span className="text-[3.25rem] font-black tracking-tight text-emerald-200">
                                ₹{selectedPlan.price}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-slate-400">
                              30-day access window. Renewal is manual in the current flow.
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 border-t border-white/10 pt-6">
                          <p className="text-[1rem] font-semibold text-slate-200">
                            What's included:
                          </p>
                          <div className="mt-5 space-y-4">
                            {selectedPlan.available.map((feature) => (
                              <div key={feature} className="flex items-center gap-3 text-[0.98rem] text-slate-100">
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
                          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400 px-5 py-4 text-[1.65rem] font-bold text-slate-950 shadow-[0_18px_44px_rgba(34,197,94,0.22)] transition-all duration-300 hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {loadingPlan === selectedPlan.key ? (
                            <>
                              <LoaderCircle size={18} className="animate-spin" />
                              Opening Razorpay
                            </>
                          ) : (
                            <>
                              Pay Now
                              <ChevronRight size={18} />
                            </>
                          )}
                        </button>

                        <p className="mt-3 text-center text-sm leading-7 text-slate-400">
                          Supports UPI, cards, wallets, net banking and other modes shown above
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Motion.section>
            )}

            <Motion.section
              className="mt-8 space-y-6"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.35 }}
            >
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Billing History
                    </p>
                    <h2 className="mt-3 text-3xl font-bold text-white">Invoices and payments</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      View your payment history, invoice IDs, plan changes, and billing status.
                    </p>
                  </div>

                  {currentPlan !== "free" && (
                    <button
                      type="button"
                      onClick={handleDowngrade}
                      disabled={Boolean(loadingPlan)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loadingPlan === "free" ? (
                        <>
                          <LoaderCircle size={16} className="animate-spin" />
                          Updating
                        </>
                      ) : (
                        <>
                          <X size={16} />
                          Downgrade to Free
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
                  <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.9fr] gap-4 bg-slate-950/55 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span>Invoice</span>
                    <span>Plan</span>
                    <span>Amount</span>
                    <span>Status</span>
                  </div>

                  {paymentHistory.length ? (
                    paymentHistory.map((entry) => (
                      <div
                        key={`${entry.invoiceId}-${entry.date}`}
                        className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.9fr] gap-4 border-t border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-200"
                      >
                        <div>
                          <div className="inline-flex items-center gap-2 font-semibold text-white">
                            <Receipt size={15} className="text-cyan-200" />
                            {entry.invoiceId}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {entry.date ? new Date(entry.date).toLocaleString() : "Date unavailable"}
                          </p>
                        </div>
                        <div className="font-medium capitalize">{entry.plan}</div>
                        <div className="font-semibold text-emerald-200">₹{Number(entry.amount || 0).toFixed(2)}</div>
                        <div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            entry.status === "paid"
                              ? "bg-emerald-400/15 text-emerald-100"
                              : "bg-amber-400/15 text-amber-100"
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-400">
                      No invoices or payment records yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              </div>
            </Motion.section>
          </div>
      </Motion.main>
      </div>
    </div>
  );
}

export default Billing;
