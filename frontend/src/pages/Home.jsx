import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* Animated counter hook */
function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setValue(Math.round(ease * target));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return [value, ref];
}

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

const Home = () => {
  const [polls, pollsRef] = useCountUp(2400);
  const [responses, responsesRef] = useCountUp(18900);
  const [teams, teamsRef] = useCountUp(340);

  return (
    <div className="animate-fade-in">
      {/* HERO */}
      <div className="hero-section">
        <div className="hero-meta-row animate-slide-up" style={{ animationDelay: "0ms" }}>
          <span className="section-label">PulseBoard 1.0</span>
          <span className="section-label">Enterprise Polling</span>
        </div>

        <h1 className="hero-headline animate-slide-up" style={{ animationDelay: "100ms", marginTop: "1rem" }}>
          Capture the room's pulse <em>instantly.</em>
        </h1>

        <div className="hero-foot mt-18 max-w-2xl animate-slide-up" style={{ animationDelay: "200ms" }}>
          <p className="hero-tagline text-left">
            Create engaging polls, share them in seconds, and watch insights
            roll in real-time. The most elegant way to make data-driven
            decisions.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link to="/register" className="btn-primary" style={{ padding: "0.625rem 1.5rem", fontSize: "0.9375rem" }}>
              Start Polling for Free
            </Link>
            <Link to="/login" className="btn-secondary" style={{ padding: "0.625rem 1.5rem", fontSize: "0.9375rem" }}>
              Log into Analytics
            </Link>
          </div>
        </div>
      </div>

      <hr style={{ border: "none", height: "1px", background: "var(--hairline-strong)", margin: "0" }} />

      {/* STATS ROW */}
      <div ref={pollsRef} className="animate-slide-up" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1px 1fr 1px 1fr", padding: "5rem 0", marginBottom: "3rem", animationDelay: "300ms", animationFillMode: "both"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="stat-number" ref={pollsRef}>{polls.toLocaleString()}+</div>
          <p className="section-label mt-2">Polls created</p>
        </div>
        <div style={{ background: "var(--hairline)", alignSelf: "stretch" }} />
        <div style={{ textAlign: "center" }}>
          <div className="stat-number" ref={responsesRef}>{responses.toLocaleString()}+</div>
          <p className="section-label mt-2">Responses collected</p>
        </div>
        <div style={{ background: "var(--hairline)", alignSelf: "stretch" }} />
        <div style={{ textAlign: "center" }}>
          <div className="stat-number" ref={teamsRef}>{teams.toLocaleString()}+</div>
          <p className="section-label mt-2">Teams using PulseBoard</p>
        </div>
      </div>

      <hr style={{ border: "none", height: "1px", background: "var(--hairline)", margin: "0" }} />

      {/* TICKER */}
      <div
        style={{
          overflow: "hidden",
          padding: "1rem 0",
          borderBottom: "1px solid var(--hairline)",
          maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "1.5rem", whiteSpace: "nowrap" }}>
              <span className="section-label" style={{ color: "var(--ink-3)" }}>{item}</span>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--hairline-strong)", flexShrink: 0 }} />
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div className="feature-row animate-slide-up" style={{ animationDelay: "350ms", background: "transparent", gap: 0, overflow: "visible", marginTop: "6rem" }}>
        <div className="animate-slide-up" style={{ animationDelay: "400ms", paddingLeft: "2rem" }}>
          <span className="section-label block mb-4">01</span>
          <h3 className="display-sm mb-3">Lightning</h3>
          <p className="hero-tagline text-sm feature-col-body" style={{ minHeight: "120px" }}>
            Build complex polls with multiple questions and mandatory checks in
            under 60 seconds.
          </p>
        </div>
        <div className="animate-slide-up" style={{ animationDelay: "450ms", borderLeft: "1px solid var(--hairline)", borderRight: "1px solid var(--hairline)", padding: "0 2rem" }}>
          <span className="section-label block mb-4">02</span>
          <h3 className="display-sm mb-3">Sharing</h3>
          <p className="hero-tagline text-sm feature-col-body" style={{ minHeight: "120px" }}>
            Generate secure links with built-in expiries. Collect feedback
            anonymously or gated.
          </p>
        </div>
        <div className="animate-slide-up" style={{ animationDelay: "500ms", paddingLeft: "2rem" }}>
          <span className="section-label block mb-4">03</span>
          <h3 className="display-sm mb-3">Analytics</h3>
          <p className="hero-tagline text-sm feature-col-body" style={{ minHeight: "120px" }}>
            Watch responses arrive in real-time. Publish beautiful result
            dashboards to your audience.
          </p>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: "5rem 0 4rem", borderTop: "1px solid var(--hairline)" }}>
        <p className="section-label mb-10" style={{ textAlign: "center" }}>How it works</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px", background: "var(--hairline)" }}>
          {[
            { step: "01", title: "Create", body: "Add a title, set an expiry, configure questions and options." },
            { step: "02", title: "Share", body: "Copy the unique link. Share with your team, audience, or embed anywhere." },
            { step: "03", title: "Analyse", body: "Live analytics update as votes come in. Publish results when you're ready." },
          ].map(({ step, title, body }) => (
            <div
              key={step}
              style={{
                background: "var(--paper)",
                padding: "2.5rem 2rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--paper)")}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "3.5rem",
                  lineHeight: 1,
                  color: "var(--ink-4)",
                  marginBottom: "1rem",
                }}
              >
                {step}.
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "var(--ink)",
                  marginBottom: "0.75rem",
                }}
              >
                {title}
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--ink-3)", lineHeight: 1.6, margin: 0 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA BAND */}
      <div
        className="polished-panel"
        style={{
          background: "linear-gradient(135deg, var(--ink) 0%, color-mix(in srgb, var(--ink) 85%, var(--accent)) 100%)",
          borderRadius: "16px",
          padding: "4rem 3rem",
          marginBottom: "4rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "2rem",
          flexWrap: "wrap",
          boxShadow: "0 20px 40px -10px color-mix(in srgb, var(--ink) 20%, transparent)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              color: "var(--paper)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Ready to pulse your team?
          </h2>
          <p style={{ color: "color-mix(in srgb, var(--paper) 60%, transparent)", fontSize: "1rem", marginTop: "0.75rem", marginBottom: 0 }}>
            Free during beta · No credit card required
          </p>
        </div>
        <Link
          to="/register"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--paper)",
            color: "var(--ink)",
            border: "1px solid var(--paper)",
            borderRadius: "6px",
            padding: "0.625rem 1.5rem",
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            transition: "opacity 0.15s",
            textDecoration: "none",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Get started free →
        </Link>
      </div>
    </div>
  );
};

export default Home;