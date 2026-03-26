import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandMark from "../components/BrandMark";

const heroStars = [
  { top: "8%", left: "4%", size: "3px", delay: "0s", duration: "4.2s" },
  { top: "16%", left: "28%", size: "4px", delay: "0.45s", duration: "4.6s" },
  { top: "27%", left: "62%", size: "3px", delay: "0.9s", duration: "4s" },
  { top: "15%", left: "88%", size: "3px", delay: "1.35s", duration: "4.4s" },
  { top: "41%", left: "19%", size: "4px", delay: "1.8s", duration: "4.1s" },
  { top: "55%", left: "41%", size: "3px", delay: "2.25s", duration: "4.8s" },
  { top: "67%", left: "84%", size: "4px", delay: "2.7s", duration: "4.05s" },
  { top: "82%", left: "12%", size: "3px", delay: "3.15s", duration: "4.5s" },
  { top: "90%", left: "52%", size: "4px", delay: "3.6s", duration: "4.15s" },
  { top: "86%", left: "91%", size: "3px", delay: "4.05s", duration: "4.35s" },
];

const heroDescriptions = [
  "Analyze your resume with AI, measure ATS compatibility, discover missing skills, and improve your profile with instant suggestions.",
  "Build a smarter resume that matches recruiter expectations and clears ATS filters with confidence.",
  "Get instant resume insights, stronger keyword targeting, and practical improvements for better job results.",
  "Discover what your resume is missing and turn it into a profile recruiters want to open.",
  "Improve resume impact, sharpen role fit, and boost your chances with AI-powered guidance.",
];

function Home() {
  const [typedDescription, setTypedDescription] = useState("");

  useEffect(() => {
    const heroDescription =
      heroDescriptions[Math.floor(Math.random() * heroDescriptions.length)];
    let index = 0;

    const typingTimer = window.setInterval(() => {
      index += 1;
      setTypedDescription(heroDescription.slice(0, index));

      if (index >= heroDescription.length) {
        window.clearInterval(typingTimer);
      }
    }, 40);

    return () => window.clearInterval(typingTimer);
  }, []);

  return (
    <div className="home-shell min-h-screen text-white px-6 py-10">
      <div className="home-aurora home-aurora--one" />
      <div className="home-aurora home-aurora--two" />
      <div className="home-aurora home-aurora--three" />
      <div className="home-starfield" aria-hidden="true">
        {heroStars.map((star, index) => (
          <span
            key={`${star.top}-${star.left}-${index}`}
            className="home-star"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
              animationDuration: star.duration,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:items-center">
          <div className="home-content">
            <BrandMark />

            <p className="home-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
              <span className="home-badge-dot" />
              Intelligent Resume Intelligence
            </p>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl">
              Build A Resume
              <span className="home-gradient-text"> Recruiters Can&apos;t Ignore</span>
            </h1>

            <p className="home-typing mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
              {typedDescription}
              <span className="home-typing-cursor" aria-hidden="true" />
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="home-btn-primary rounded-xl px-7 py-3 font-semibold"
              >
                Start Now
              </Link>

              <Link
                to="/register"
                className="home-btn-secondary rounded-xl px-7 py-3 font-semibold"
              >
                Create Account
              </Link>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="home-mini-card">
                <p className="text-2xl font-bold text-cyan-300">98%</p>
                <p className="text-xs text-slate-300">ATS Parsing</p>
              </div>
              <div className="home-mini-card">
                <p className="text-2xl font-bold text-sky-300">12+</p>
                <p className="text-xs text-slate-300">Skill Categories</p>
              </div>
              <div className="home-mini-card">
                <p className="text-2xl font-bold text-rose-300">24/7</p>
                <p className="text-xs text-slate-300">AI Suggestions</p>
              </div>
            </div>
          </div>

          <div className="home-visual">
            <div className="home-sparkfield" />
            <div className="home-planet home-planet--left" />
            <div className="home-planet-ring home-planet-ring--main" />
            <div className="home-planet-ring home-planet-ring--secondary" />
            <div className="home-planet home-planet--main" />
            <div className="home-planet home-planet--small" />
            <div className="home-planet home-planet--mist" />
            <div className="home-glass">
              <p className="text-sm font-semibold text-cyan-200">Resume Impact</p>
              <p className="mt-2 text-3xl font-bold">86%</p>
              <p className="mt-1 text-xs text-slate-300">Strong ATS Compatibility</p>
              <div className="home-progress mt-5">
                <span />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="home-chip">Keyword Match</div>
                <div className="home-chip">Skills Density</div>
                <div className="home-chip">Structure Score</div>
                <div className="home-chip">Role Fit</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
