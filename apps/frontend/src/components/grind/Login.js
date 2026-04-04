import { useState } from "react";
import "./Login.css";

const GRADE_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Grad"];

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", gradeYear: "", email: "" });
  const [error, setError] = useState("");

  function handle(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  function submit(e) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.gradeYear || !form.email.trim()) {
      setError("All fields are required.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    onLogin(form);
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-dot" />
          <span className="login-brand">GRIND</span>
        </div>
        <h1 className="login-title">
          Know yourself.
          <br />
          Beat the semester.
        </h1>
        <p className="login-sub">Your personal academic operator.</p>

        <form onSubmit={submit} className="login-form">
          <div className="login-row">
            <div className="login-field">
              <label>First name</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handle}
                placeholder="Atharv"
                autoComplete="off"
              />
            </div>
            <div className="login-field">
              <label>Last name</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handle}
                placeholder="Parsewar"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="login-field">
            <label>Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handle}
              placeholder="atharv@example.com"
              type="email"
              autoComplete="off"
            />
          </div>

          <div className="login-field">
            <label>Grade year</label>
            <div className="grade-pills">
              {GRADE_YEARS.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={`grade-pill ${form.gradeYear === year ? "active" : ""}`}
                  onClick={() => {
                    setForm({ ...form, gradeYear: year });
                    setError("");
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit">
            Start grinding ->
          </button>
        </form>
      </div>
    </div>
  );
}
