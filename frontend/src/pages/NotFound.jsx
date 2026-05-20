import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="status-page animate-fade-in">
    <div className="status-page__display">404</div>
    <h1 className="status-page__title">Page not found</h1>
    <p className="status-page__text">
      The page you are looking for doesn’t exist or may have been moved.
    </p>
    <Link to="/" className="btn-primary">
      Return Home
    </Link>
  </div>
);

export default NotFound;
