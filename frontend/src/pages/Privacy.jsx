import { Link } from "react-router-dom";

const Privacy = () => (
  <div className="legal-page animate-fade-in">
    <Link to="/" className="legal-page__back">
      ← Back home
    </Link>
    <h1 className="legal-page__title">Privacy Policy</h1>
    <p className="legal-page__updated">Last updated: May 2026</p>

    <section className="legal-page__section">
      <h2>What we collect</h2>
      <p>
        Account data (name, email, optional Google avatar) and the polls and
        responses you create. Passwords are stored only as bcrypt hashes.
      </p>
    </section>
    <section className="legal-page__section">
      <h2>Anonymous polls</h2>
      <p>
        When a poll is marked anonymous, responses are stored without any link
        to the responding account. Voter identities are never recorded for
        those polls.
      </p>
    </section>
    <section className="legal-page__section">
      <h2>Authenticated polls</h2>
      <p>
        For non-anonymous polls, the poll creator can see which option each
        respondent chose. Respondents are shown this before voting.
      </p>
    </section>
    <section className="legal-page__section">
      <h2>Data removal</h2>
      <p>
        Deleting a poll removes it from your dashboard. Contact the maintainers
        for full account deletion. This is placeholder copy for a portfolio
        project.
      </p>
    </section>
  </div>
);

export default Privacy;
