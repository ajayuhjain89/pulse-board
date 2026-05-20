import { Link } from "react-router-dom";

const Terms = () => (
  <div className="legal-page animate-fade-in">
    <Link to="/" className="legal-page__back">
      ← Back home
    </Link>
    <h1 className="legal-page__title">Terms of Service</h1>
    <p className="legal-page__updated">Last updated: May 2026</p>

    <section className="legal-page__section">
      <h2>1. Acceptance</h2>
      <p>
        By creating an account or using PulseBoard you agree to these terms.
        PulseBoard is provided “as is” during its beta period.
      </p>
    </section>
    <section className="legal-page__section">
      <h2>2. Your content</h2>
      <p>
        You retain ownership of the polls and responses you create. You are
        responsible for ensuring your polls comply with applicable laws and do
        not collect data you are not entitled to collect.
      </p>
    </section>
    <section className="legal-page__section">
      <h2>3. Acceptable use</h2>
      <p>
        Don’t use PulseBoard to harass, deceive, or distribute unlawful
        content. We may suspend accounts that abuse the service.
      </p>
    </section>
    <section className="legal-page__section">
      <h2>4. Contact</h2>
      <p>
        Questions about these terms can be sent to the project maintainers.
        This is placeholder copy for a portfolio project.
      </p>
    </section>
  </div>
);

export default Terms;
