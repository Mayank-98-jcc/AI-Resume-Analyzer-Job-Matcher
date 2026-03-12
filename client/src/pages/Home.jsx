import { Link } from "react-router-dom";
import BrandMark from "../components/BrandMark";

function Home() {
  return (
    <div className="home-shell min-h-screen text-white px-6 py-10">
      <div className="home-aurora home-aurora--one" />
      <div className="home-aurora home-aurora--two" />
      <div className="home-aurora home-aurora--three" />

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

            <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
              Analyze your resume with AI, measure ATS compatibility, discover missing
              skills, and improve your profile with instant suggestions.
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
            <div className="home-orbit home-orbit--outer" />
            <div className="home-orbit home-orbit--inner" />
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
