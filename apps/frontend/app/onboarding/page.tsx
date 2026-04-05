'use client';

import { useState } from 'react';

export default function OnboardingPage() {
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [purdueUrl, setPurdueUrl] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleConnectCalendar = () => {
    // Simulate OAuth connection
    setIsCalendarConnected(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate submission
    setIsSubmitted(true);
    // In real app, save to backend or redirect
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="max-w-md w-full bg-surface rounded-card border border-line shadow-soft p-6">
          <h1 className="text-2xl font-bold text-center mb-4">Welcome to Grind!</h1>
          <p className="text-center text-muted">Your onboarding is complete. You can now start using the app.</p>
          <a href="/" className="block mt-4 text-center bg-accent text-surface py-2 px-4 rounded-card hover:bg-accent/90">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="max-w-md w-full bg-surface rounded-card border border-line shadow-soft p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Welcome to Grind</h1>
        <p className="text-center text-muted mb-6">Let's get you set up!</p>

        {!isCalendarConnected ? (
          <div className="mb-6">
            <button
              onClick={handleConnectCalendar}
              className="w-full bg-accent text-surface py-3 px-4 rounded-card hover:bg-accent/90 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Calendar
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center text-safe mb-4">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Google Calendar Connected
            </div>
            <form onSubmit={handleSubmit}>
              <label htmlFor="purdueUrl" className="block text-sm font-medium text-ink mb-2">
                Enter your Purdue URL to work around integration:
              </label>
              <input
                type="url"
                id="purdueUrl"
                value={purdueUrl}
                onChange={(e) => setPurdueUrl(e.target.value)}
                placeholder="https://purdue.example.com"
                className="w-full px-3 py-2 border border-line rounded-card bg-canvas focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
              <button
                type="submit"
                className="w-full mt-4 bg-accent text-surface py-2 px-4 rounded-card hover:bg-accent/90"
              >
                Complete Onboarding
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}