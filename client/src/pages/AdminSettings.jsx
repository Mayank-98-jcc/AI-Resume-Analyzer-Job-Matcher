import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  BellRing,
  BrushCleaning,
  Check,
  Gauge,
  Sparkles,
  SunMoon,
  Wand2
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import {
  applyAdminPreferences,
  defaultAdminPreferences,
  loadAdminPreferences,
  saveAdminPreferences
} from "../utils/adminPreferences";

const themeOptions = [
  {
    value: "dark",
    label: "Dark",
    description: "Cosmic admin panels with neon contrast.",
    swatch: "from-slate-950 via-blue-950 to-fuchsia-900"
  },
  {
    value: "light",
    label: "Light",
    description: "Bright glass surfaces with softer contrast.",
    swatch: "from-sky-100 via-white to-orange-100"
  }
];

const motionOptions = [
  {
    value: "expressive",
    label: "Expressive",
    description: "Full motion, shimmer, and floating ambient effects."
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Subtle transitions for a calmer admin workspace."
  }
];

const refreshOptions = [
  { value: 15, label: "15s", description: "Fastest updates for the bell and live panels." },
  { value: 30, label: "30s", description: "Balanced refresh speed for everyday use." },
  { value: 60, label: "60s", description: "Low-noise refresh interval for quieter sessions." }
];

const effectsOptions = [
  {
    value: "vivid",
    label: "Vivid",
    description: "Glow, stars, and stronger gradients."
  },
  {
    value: "soft",
    label: "Soft",
    description: "Cleaner surfaces with more restrained atmosphere."
  }
];

function OptionTile({ active, onClick, title, description, preview }) {
  return (
    <Motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`relative overflow-hidden rounded-[28px] border p-4 text-left transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/12 shadow-[0_18px_40px_rgba(34,211,238,0.16)]"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-slate-300">{description}</p>
        </div>
        <Motion.span
          animate={{ scale: active ? 1 : 0.85, opacity: active ? 1 : 0.4 }}
          className={`flex h-8 w-8 items-center justify-center rounded-full border ${
            active
              ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
              : "border-white/10 bg-white/5 text-slate-400"
          }`}
        >
          <Check size={15} />
        </Motion.span>
      </div>
      {preview ? <div className="mt-4">{preview}</div> : null}
    </Motion.button>
  );
}

function AdminSettings() {
  const [preferences, setPreferences] = useState(() => loadAdminPreferences());
  const [savePulse, setSavePulse] = useState(false);

  useEffect(() => {
    applyAdminPreferences(preferences);
    saveAdminPreferences(preferences);
    setSavePulse(true);
    const id = window.setTimeout(() => setSavePulse(false), 700);
    return () => window.clearTimeout(id);
  }, [preferences]);

  const summary = useMemo(() => {
    const theme = themeOptions.find((item) => item.value === preferences.theme)?.label || "Dark";
    const motion = motionOptions.find((item) => item.value === preferences.motion)?.label || "Expressive";
    const refresh = refreshOptions.find((item) => item.value === preferences.refreshSeconds)?.label || "15s";
    const effects = effectsOptions.find((item) => item.value === preferences.effects)?.label || "Vivid";

    return `${theme} theme • ${motion} motion • ${refresh} refresh • ${effects} effects`;
  }, [preferences]);

  const updatePreference = (key, value) => {
    setPreferences((current) => ({
      ...current,
      [key]: value
    }));
  };

  const resetPreferences = () => {
    setPreferences(defaultAdminPreferences);
  };

  return (
    <AdminLayout title="Settings" subtitle="Shape the admin workspace with saved preferences, smoother control, and richer visuals.">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="admin-settings-panel relative overflow-hidden rounded-[36px] border border-white/10 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:p-7"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(82,210,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,121,198,0.12),transparent_26%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                  <Wand2 size={20} />
                </span>
                <div>
                  <p className="text-lg font-semibold text-white">Workspace Preferences</p>
                  <p className="text-sm text-slate-300">Changes save instantly and update the admin shell live.</p>
                </div>
              </div>

              <Motion.button
                type="button"
                onClick={resetPreferences}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Reset defaults
              </Motion.button>
            </div>

            <div className="mt-8 space-y-8">
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200">
                    <SunMoon size={18} />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">Theme</p>
                    <p className="text-sm text-slate-300">Switch the admin shell between bright and dark atmospheres.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {themeOptions.map((option) => (
                    <OptionTile
                      key={option.value}
                      active={preferences.theme === option.value}
                      onClick={() => updatePreference("theme", option.value)}
                      title={option.label}
                      description={option.description}
                      preview={
                        <div className={`h-24 rounded-3xl bg-gradient-to-br ${option.swatch} p-3`}>
                          <div className="h-full rounded-[20px] border border-white/30 bg-white/20" />
                        </div>
                      }
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">Motion</p>
                    <p className="text-sm text-slate-300">Control how energetic the interface feels.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {motionOptions.map((option) => (
                    <OptionTile
                      key={option.value}
                      active={preferences.motion === option.value}
                      onClick={() => updatePreference("motion", option.value)}
                      title={option.label}
                      description={option.description}
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200">
                    <BellRing size={18} />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">Live Refresh</p>
                    <p className="text-sm text-slate-300">Tune how often the notification bell checks for fresh activity.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {refreshOptions.map((option) => (
                    <OptionTile
                      key={option.value}
                      active={preferences.refreshSeconds === option.value}
                      onClick={() => updatePreference("refreshSeconds", option.value)}
                      title={option.label}
                      description={option.description}
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200">
                    <BrushCleaning size={18} />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">Visual Effects</p>
                    <p className="text-sm text-slate-300">Decide how much glow and atmosphere surrounds the admin dashboard.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {effectsOptions.map((option) => (
                    <OptionTile
                      key={option.value}
                      active={preferences.effects === option.value}
                      onClick={() => updatePreference("effects", option.value)}
                      title={option.label}
                      description={option.description}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </Motion.section>

        <div className="space-y-6">
          <Motion.section
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
            className="admin-settings-panel relative overflow-hidden rounded-[36px] border border-white/10 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-100">
                <Gauge size={20} />
              </span>
              <div>
                <p className="text-lg font-semibold text-white">Live Preview</p>
                <p className="text-sm text-slate-300">A quick glance at the workspace mood you just picked.</p>
              </div>
            </div>

            <Motion.div
              key={summary}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className={`mt-6 overflow-hidden rounded-[28px] border p-4 ${
                preferences.theme === "light"
                  ? "border-slate-200/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(236,244,255,0.88))]"
                  : "border-white/10 bg-[linear-gradient(145deg,rgba(10,16,38,0.96),rgba(27,33,72,0.92))]"
              }`}
            >
              <div
                className={`rounded-[22px] p-4 ${
                  preferences.theme === "light"
                    ? "bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_28%),linear-gradient(160deg,rgba(248,250,252,0.92),rgba(241,245,249,0.88))]"
                    : "bg-[radial-gradient(circle_at_top_left,rgba(58,208,255,0.2),transparent_24%),linear-gradient(160deg,rgba(7,12,30,0.96),rgba(21,28,60,0.88))]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${preferences.theme === "light" ? "text-slate-900" : "text-white"}`}>
                      Admin cockpit
                    </p>
                    <p className={`text-xs ${preferences.theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                      {summary}
                    </p>
                  </div>
                  <Motion.div
                    animate={preferences.motion === "expressive" ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.6 }}
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      preferences.theme === "light" ? "bg-slate-900 text-white" : "bg-white/10 text-cyan-100"
                    }`}
                  >
                    <Sparkles size={16} />
                  </Motion.div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((item) => (
                    <Motion.div
                      key={item}
                      animate={
                        preferences.motion === "expressive"
                          ? { y: [0, -3, 0], opacity: [0.86, 1, 0.86] }
                          : { y: 0, opacity: 0.95 }
                      }
                      transition={{ duration: 2 + item * 0.35, repeat: Infinity, ease: "easeInOut" }}
                      className={`h-16 rounded-[20px] ${
                        preferences.theme === "light"
                          ? "bg-white/80 shadow-[0_12px_24px_rgba(148,163,184,0.14)]"
                          : "bg-white/8"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </Motion.div>

            <AnimatePresence>
              {savePulse ? (
                <Motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
                >
                  Preferences saved instantly.
                </Motion.div>
              ) : null}
            </AnimatePresence>
          </Motion.section>

        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminSettings;
