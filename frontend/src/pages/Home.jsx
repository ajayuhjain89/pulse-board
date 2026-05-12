import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="animate-fade-in">
      <div className="hero-section">
        <div className="hero-meta-row">
          <span className="section-label">PulseBoard 1.0</span>
          <span className="section-label">Enterprise Polling</span>
        </div>

        <h1 className="hero-headline animate-slide-up">
          Capture the room's pulse <em>instantly.</em>
        </h1>

        <div className="hero-foot mt-16 max-w-2xl">
          <p className="hero-tagline text-left">
            Create engaging polls, share them in seconds, and watch insights
            roll in real-time. The most elegant way to make data-driven
            decisions.
          </p>
          <div className="flex gap-4">
            <Link to="/register" className="btn-primary">
              Start Polling for Free
            </Link>
            <Link to="/login" className="btn-secondary">
              Log into Analytics
            </Link>
          </div>
        </div>
      </div>

      <hr style={{border:'none', height:'1px', background:'var(--hairline-strong)', margin:'0'}} />

      <div className="feature-row mt-12 py-8" style={{background: 'transparent', gap: 0, overflow: 'visible'}}>
        <div style={{paddingLeft: '2rem'}}>
          <span className="section-label block mb-4">01</span>
          <h3 className="display-sm mb-3">Lightning</h3>
          <p className="hero-tagline text-sm feature-col-body" style={{ minHeight: '120px' }}>
            Build complex polls with multiple questions and mandatory checks in
            under 60 seconds.
          </p>
        </div>
        <div style={{borderLeft: '1px solid var(--hairline)', borderRight: '1px solid var(--hairline)', padding: '0 2rem'}}>
          <span className="section-label block mb-4">02</span>
          <h3 className="display-sm mb-3">Sharing</h3>
          <p className="hero-tagline text-sm feature-col-body" style={{ minHeight: '120px' }}>
            Generate secure links with built-in expiries. Collect feedback
            anonymously or gated.
          </p>
        </div>
        <div style={{paddingLeft: '2rem'}}>
          <span className="section-label block mb-4">03</span>
          <h3 className="display-sm mb-3">Analytics</h3>
          <p className="hero-tagline text-sm feature-col-body" style={{ minHeight: '120px' }}>
            Watch responses arrive in real-time. Publish beautiful result
            dashboards to your audience.
          </p>
        </div>
      </div>
      
      <div className="text-center py-12">
        <span className="section-label" style={{color:'var(--ink-4)'}}>Free during beta · No credit card required</span>
      </div>
    </div>
  );
};

export default Home;
