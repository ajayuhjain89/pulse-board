import { Link } from "react-router-dom";

const TICKER_ITEMS = [
  "Real-time Analytics",
  "Anonymous Responses",
  "Multi-Question Polls",
  "Authenticated Voting",
  "Live Result Dashboards",
  "One-Click Sharing",
  "Expiry Controls",
  "Optional Questions",
];

const FEATURES = [
  {
    num: "01",
    title: "Lightning",
    body: "Build complex polls with multiple questions and mandatory checks in under 60 seconds.",
  },
  {
    num: "02",
    title: "Sharing",
    body: "Generate secure links with built-in expiries. Collect feedback anonymously or gated.",
  },
  {
    num: "03",
    title: "Analytics",
    body: "Watch responses arrive in real-time. Publish beautiful result dashboards to your audience.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create",
    body: "Add a title, set an expiry, configure questions and options.",
  },
  {
    step: "02",
    title: "Share",
    body: "Copy the unique link. Share with your team, audience, or embed anywhere.",
  },
  {
    step: "03",
    title: "Analyse",
    body: "Live analytics update as votes come in. Publish results when you're ready.",
  },
];

const Home = () => {
  return (
    <div className="animate-fade-in">
      {/* HERO */}
      <div className="hero-section">
        <div
          className="hero-meta-row animate-slide-up"
          style={{ animationDelay: "0ms" }}
        >
          <span className="section-label">PulseBoard 1.0</span>
          <span className="section-label">Enterprise Polling</span>
        </div>

        <h1
          className="hero-headline animate-slide-up"
          style={{ animationDelay: "100ms", marginTop: "1rem" }}
        >
          Capture the room's pulse <em>instantly.</em>
        </h1>

        <div
          className="hero-foot mt-18 max-w-2xl animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <p className="hero-tagline text-left">
            Create engaging polls, share them in seconds, and watch insights
            roll in real-time. The most elegant way to make data-driven
            decisions.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link
              to="/register"
              className="btn-primary"
              style={{ padding: "0.625rem 1.5rem", fontSize: "0.9375rem" }}
            >
              Start Polling for Free
            </Link>
            <Link
              to="/login"
              className="btn-secondary"
              style={{ padding: "0.625rem 1.5rem", fontSize: "0.9375rem" }}
            >
              Log into Analytics
            </Link>
          </div>
        </div>
      </div>

      <hr className="home-rule" />

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="ticker-item">
              <span className="section-label" style={{ color: "var(--ink-3)" }}>
                {item}
              </span>
              <span className="ticker-dot" />
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div
        className="home-features animate-slide-up"
        style={{ animationDelay: "350ms" }}
      >
        {FEATURES.map(({ num, title, body }) => (
          <div key={num} className="home-feature">
            <span className="section-label block mb-4">{num}</span>
            <h3 className="display-sm mb-3">{title}</h3>
            <p className="hero-tagline text-sm feature-col-body">{body}</p>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <div className="home-how">
        <p className="section-label mb-10" style={{ textAlign: "center" }}>
          How it works
        </p>
        <div className="home-steps">
          {STEPS.map(({ step, title, body }) => (
            <div key={step} className="home-step">
              <div className="home-step__num">{step}.</div>
              <h3 className="home-step__title">{title}</h3>
              <p className="home-step__body">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA BAND */}
      <div className="cta-band polished-panel">
        <div>
          <h2 className="cta-band__title">Ready to pulse your team?</h2>
          <p className="cta-band__sub">
            Free during beta · No credit card required
          </p>
        </div>
        <Link to="/register" className="cta-band__btn">
          Get started free →
        </Link>
      </div>
    </div>
  );
};

export default Home;
