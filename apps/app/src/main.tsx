import React from 'react';
import { createRoot } from 'react-dom/client';
import { StudentApp } from './student';
import { TeacherApp } from './teacher';
import './style.css';
import './interface.css';
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>Let's get back to learning.</h1>
        <p>{this.state.error}</p>
        <p>Your saved attempts are kept on this device.</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    {location.pathname.startsWith('/teacher') ? <TeacherApp /> : <StudentApp />}
  </ErrorBoundary>,
);
if ('serviceWorker' in navigator && import.meta.env.PROD)
  void navigator.serviceWorker.register('/sw.js').catch(() => {
    /* Native app has a bundled shell; plain HTTP LAN cannot register SW. */
  });
