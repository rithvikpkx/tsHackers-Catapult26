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
    if (!form.email.endsWith("@purdue.edu")) {
      setError("Must be a @purdue.edu email.");
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
        <h1 className="login-title">Know yourself.<br />Beat the semester.</h1>
        <p className="login-sub">Your personal academic operator.</p>

        <form onSubmit={submit} className="login-form">
          <div className="login-row">
            <div className="login-field">
              <label>First name</label>
              <input name="firstName" value={form.firstName} onChange={handle} placeholder="Rithvik" autoComplete="off" />
            </div>
            <div className="login-field">
              <label>Last name</label>
              <input name="lastName" value={form.lastName} onChange={handle} placeholder="Sharma" autoComplete="off" />
            </div>
          </div>

          <div className="login-field">
            <label>Purdue email</label>
            <input name="email" value={form.email} onChange={handle} placeholder="rithvik@purdue.edu" type="email" autoComplete="off" />
          </div>

          <div className="login-field">
            <label>Grade year</label>
            <div className="grade-pills">
              {GRADE_YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`grade-pill ${form.gradeYear === y ? "active" : ""}`}
                  onClick={() => { setForm({ ...form, gradeYear: y }); setError(""); }}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit">
            Start grinding →
          </button>
        </form>
      </div>
    </div>
  );
}
