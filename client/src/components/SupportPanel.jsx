import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  Bug,
  ChevronDown,
  ClipboardList,
  CreditCard,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  Phone,
  RotateCcw,
  Send,
  X
} from "lucide-react";
import API from "../services/api";

const feedbackCategories = ["Bug", "Feature Request", "General Feedback"];

function formatChatTimestamp(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((index) => (
        <Motion.span
          key={index}
          className="h-2 w-2 rounded-full bg-slate-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.12, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

function getCategoryMeta(category) {
  if (category === "Bug") {
    return {
      icon: Bug,
      iconClassName: "text-rose-300",
      label: "Bug",
      helper: "Describe the issue and what went wrong.",
      quickTitle: "Bug report",
      quickActions: ["Report crash", "UI glitch", "Login issue"]
    };
  }

  if (category === "Feature Request") {
    return {
      icon: MessageCircle,
      iconClassName: "text-sky-300",
      label: "Feedback",
      helper: "Share an idea that could improve ResumeIQ.",
      quickTitle: "Feedback idea",
      quickActions: ["Improve dashboard", "New resume template", "Better AI rewrite"]
    };
  }

  return {
    icon: CreditCard,
    iconClassName: "text-amber-200",
    label: "General",
    helper: "Ask for help with account, plan, or general questions.",
    quickTitle: "Need help?",
    quickActions: ["Check payment status", "Retry payment", "Contact ResumeIQ"]
  };
}

function SupportPanel() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(feedbackCategories[0]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const categoryMeta = getCategoryMeta(category);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const scrollToBottom = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    };

    const frameId = window.requestAnimationFrame(scrollToBottom);
    return () => window.cancelAnimationFrame(frameId);
  }, [messages, typing]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow || "auto";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryUnavailable(false);
        setError("");

        const response = await API.get("/support/history");
        if (!active) return;

        const nextMessages = (Array.isArray(response.data?.data) ? response.data.data : [])
          .slice()
          .sort((a, b) => new Date(a.lastMessageAt || a.createdAt || 0).getTime() - new Date(b.lastMessageAt || b.createdAt || 0).getTime())
          .flatMap((session) =>
            (Array.isArray(session.messages) ? session.messages : []).map((item) => ({
              id: item._id,
              sessionId: session._id,
              role: item.role,
              text: item.message,
              time: item.createdAt,
              category: item.category || session.category
            }))
          );

        setMessages(nextMessages);
      } catch (fetchError) {
        if (!active) return;
        console.error("Support history error:", fetchError);
        setMessages([]);
        setHistoryUnavailable(true);
      } finally {
        if (active) setHistoryLoading(false);
      }
    };

    fetchHistory();

    return () => {
      active = false;
    };
  }, [open]);

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    window.setTimeout(() => {
      setInput("");
      setTyping(false);
      setError("");
      setHistoryUnavailable(false);
      setCategory(feedbackCategories[0]);
    }, 220);
  };

  const submitMessage = async (rawMessage) => {
    const submittedText = String(rawMessage || "").trim();

    if (!submittedText) {
      setError("Please type a message before sending.");
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimisticTime = new Date().toISOString();

    setError("");
    setLoading(true);
    setTyping(true);
    setInput("");
    setMessages((current) => [
      ...current,
      {
        id: optimisticId,
        role: "user",
        text: submittedText,
        time: optimisticTime,
        category,
        pending: true
      }
    ]);

    try {
      const response = await API.post("/support", {
        category,
        message: submittedText
      });

      const reply = response.data?.reply || "Thanks for your feedback! Our team will review it.";
      const savedEntry = response.data?.message || null;
      const sessionId = response.data?.sessionId || null;

      window.setTimeout(() => {
        setMessages((current) => {
          const next = current.map((item) =>
            item.id === optimisticId
              ? {
                  id: savedEntry?._id || optimisticId,
                  sessionId,
                  role: "user",
                  text: savedEntry?.message || submittedText,
                  time: savedEntry?.createdAt || optimisticTime,
                  category: savedEntry?.category || category
                }
              : item
          );

          return [
            ...next,
            {
              id: `${savedEntry?._id || Date.now()}-system`,
              sessionId,
              role: "system",
              text: reply,
              time: savedEntry?.createdAt || new Date().toISOString()
            }
          ];
        });
        setTyping(false);
        setLoading(false);
      }, 500);
    } catch (submitError) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setTyping(false);
      setLoading(false);
      setError(submitError?.response?.data?.message || "Unable to send feedback right now.");
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    await submitMessage(input);
  };

  const handleQuickAction = async (value) => {
    if (loading) return;
    await submitMessage(value);
  };

  return (
    <>
      <Motion.button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
          setHistoryUnavailable(false);
        }}
        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-200/30 bg-[linear-gradient(135deg,#0ea5e9_0%,#2563eb_45%,#8b5cf6_100%)] text-white shadow-[0_18px_55px_rgba(37,99,235,0.45),0_0_35px_rgba(14,165,233,0.28)] sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
        whileHover={{ scale: 1.08, y: -3 }}
        whileTap={{ scale: 0.96 }}
        animate={{
          boxShadow: [
            "0 18px 55px rgba(37,99,235,0.38), 0 0 0 rgba(14,165,233,0.18)",
            "0 22px 60px rgba(37,99,235,0.48), 0 0 24px rgba(14,165,233,0.34)",
            "0 18px 55px rgba(37,99,235,0.38), 0 0 0 rgba(14,165,233,0.18)"
          ]
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        aria-label="Open support panel"
      >
        <Motion.span
          className="absolute inset-0 rounded-full border border-white/20"
          animate={{ scale: [1, 1.16, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: "easeOut" }}
        />
        <MessageCircle size={24} className="relative z-10" />
      </Motion.button>

      <AnimatePresence>
        {open ? (
          <>
            <Motion.button
              type="button"
              aria-label="Close support panel overlay"
              className="fixed inset-0 z-[75] bg-slate-950/35 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={handleClose}
            />

            <Motion.aside
              initial={{ opacity: 0, x: 36, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="fixed inset-y-0 right-0 z-[80] flex w-full items-center justify-end p-3 sm:p-5"
              onClick={handleClose}
            >
              <div
                className="relative flex h-[min(96vh,940px)] w-full max-w-[510px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,23,49,0.97)_0%,rgba(17,19,42,0.98)_100%)] shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,120,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.08),transparent_30%)]" />

                <header className="relative flex items-start justify-between border-b border-white/8 px-6 py-6">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-sm font-medium text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />
                      ResumeIQ
                    </div>
                    <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-white">
                      Support &amp; Feedback
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">We usually reply instantly</p>
                  </div>

                  <Motion.button
                    type="button"
                    onClick={handleClose}
                    whileHover={{ scale: 1.04, rotate: 90 }}
                    whileTap={{ scale: 0.96 }}
                    className="ml-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08]"
                    aria-label="Close support panel"
                  >
                    <X size={18} />
                  </Motion.button>
                </header>

                <div className="relative flex min-h-0 flex-1 flex-col px-6 py-4">
                  <div className="mb-5 flex items-center gap-4">
                    <p className="w-20 shrink-0 text-sm font-medium text-slate-300">Category:</p>
                    <div className="relative flex-1">
                      <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        disabled={loading}
                        className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-10 text-sm text-slate-100 outline-none transition focus:border-indigo-300/40"
                      >
                        {feedbackCategories.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="mb-5 flex min-h-0 flex-1 flex-col rounded-[24px] border border-white/8 bg-white/[0.025] px-4 py-4">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]">
                        <categoryMeta.icon size={17} className={categoryMeta.iconClassName} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{categoryMeta.label}</p>
                        <p className="text-xs text-slate-400">{categoryMeta.helper}</p>
                      </div>
                    </div>

                    <div ref={messagesContainerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                      {historyLoading ? (
                        <div className="rounded-3xl border border-white/10 bg-slate-950/25 px-4 py-5 text-sm text-slate-400">
                          Loading feedback history...
                        </div>
                      ) : messages.length === 0 && !typing ? (
                        <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/25 px-4 py-5 text-sm text-slate-400">
                          {historyUnavailable ? "No feedback history available yet" : "No feedback yet"}
                        </div>
                      ) : (
                        <>
                          {messages.map((msg) => (
                            <Motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                                  msg.role === "user"
                                    ? "rounded-br-md bg-[linear-gradient(135deg,rgba(73,111,255,0.98),rgba(47,85,235,0.96))] text-white shadow-[0_16px_35px_rgba(37,99,235,0.2)]"
                                    : "rounded-bl-md border border-white/10 bg-[linear-gradient(180deg,rgba(42,45,77,0.92),rgba(34,36,67,0.88))] text-slate-100 backdrop-blur-sm"
                                }`}
                              >
                                {msg.role === "system" && msg.category ? (
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-slate-200">
                                      {msg.category}
                                    </span>
                                  </div>
                                ) : null}

                                <p className="text-[15px]">{msg.text}</p>

                                <p className={`mt-2 text-[11px] ${msg.role === "user" ? "text-white/65" : "text-slate-400"}`}>
                                  {formatChatTimestamp(msg.time)}
                                </p>
                              </div>
                            </Motion.div>
                          ))}

                          {typing ? (
                            <Motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex justify-start"
                            >
                              <div className="max-w-[88%] rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(42,45,77,0.92),rgba(34,36,67,0.88))] px-4 py-3 text-sm text-slate-100 backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <TypingDots />
                                  <p>ResumeIQ is typing...</p>
                                </div>
                              </div>
                            </Motion.div>
                          ) : null}
                        </>
                      )}

                    </div>
                    <div ref={messagesEndRef} className="h-px" />
                  </div>

                  <div className="mb-4 rounded-[22px] border border-white/10 bg-white/[0.025] p-3">
                    <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
                      {category === "Bug" ? <Bug size={14} className="text-rose-300" /> : null}
                      {category === "Feature Request" ? <ClipboardList size={14} className="text-sky-300" /> : null}
                      {category === "General Feedback" ? <CreditCard size={14} className="text-amber-200" /> : null}
                      <span className="font-medium">{categoryMeta.quickTitle}</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {categoryMeta.quickActions.map((action, index) => {
                        const Icon = index === 0 ? CreditCard : index === 1 ? RotateCcw : Phone;
                        return (
                          <button
                            key={action}
                            type="button"
                            onClick={() => {
                              handleQuickAction(action);
                            }}
                            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                          >
                            <Icon size={14} />
                            {action}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {historyUnavailable ? (
                    <p className="mb-3 text-xs text-slate-500">
                      Previous feedback could not be loaded right now, but you can still send a new message.
                    </p>
                  ) : null}

                  {error ? (
                    <Motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                    >
                      {error}
                    </Motion.p>
                  ) : null}

                  <form onSubmit={handleSend} className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,23,49,0.74),rgba(15,17,38,0.92))] p-3">
                    <div className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-slate-950/25 px-4 py-3">
                      <input
                        type="text"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        disabled={loading}
                        placeholder="Type your message..."
                        className="min-h-[24px] flex-1 border-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      />

                      <button
                        type="button"
                        className="text-slate-400 transition hover:text-slate-200"
                        aria-label="Attach file"
                      >
                        <Paperclip size={17} />
                      </button>

                      <Motion.button
                        type="submit"
                        disabled={loading || !input.trim()}
                        whileHover={loading ? undefined : { scale: 1.04 }}
                        whileTap={loading ? undefined : { scale: 0.97 }}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(73,111,255,0.98),rgba(47,85,235,0.96))] text-white shadow-[0_10px_22px_rgba(47,85,235,0.35)] transition disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Send feedback"
                      >
                        {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
                      </Motion.button>
                    </div>
                  </form>
                </div>
              </div>
            </Motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export default SupportPanel;
