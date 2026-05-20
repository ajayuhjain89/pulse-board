import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-boundary">
        <div className="error-boundary__display">Something broke.</div>
        <p className="error-boundary__text">
          An unexpected error occurred while rendering this page. Reloading
          usually fixes it.
        </p>
        <button onClick={this.handleReload} className="btn-primary">
          Reload PulseBoard
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
