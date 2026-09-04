import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoMark } from "../components/Navbar";
import EventPassStack from "../components/EventPassStack";

const DASHBOARD_BY_ROLE = {
  STUDENT: "/student/dashboard",
  ORGANIZER: "/organizer/dashboard",
  ADMIN: "/admin/dashboard",
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      const redirectTo = location.state?.from?.pathname || DASHBOARD_BY_ROLE[user.role] || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* LEFT PANEL */}
      <div className="hidden flex-col justify-between bg-ink p-12 text-paper md:flex">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark light />
          <span className="font-display text-xl font-semibold">UniEvents</span>
        </Link>

        <div>
          <p className="font-display text-2xl font-medium leading-snug">Discover. Register. Participate.</p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-paper/60">
            Your centralized platform for discovering, managing and participating in university events.
          </p>
          <div className="mt-10">
            <EventPassStack />
          </div>
        </div>

        <div />
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 flex items-center gap-2 md:hidden">
            <LogoMark />
            <span className="font-display text-xl font-semibold text-ink">UniEvents</span>
          </Link>

          <h1 className="font-display text-3xl font-semibold text-ink">Welcome Back</h1>
          <p className="mt-2 text-[15px] text-ink-soft">Sign in to your UniEvents account</p>

          {error && (
            <div className="mt-6 rounded-sharp border border-maroon/30 bg-maroon/5 px-4 py-3 text-[14px] text-maroon">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-[14px] font-medium text-ink">
                University Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@unievents.edu"
                className="mt-2 w-full rounded-sharp border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-ink"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[14px] font-medium text-ink">
                  Password
                </label>
                <Link to="/login" className="text-[13px] text-brass-dark hover:text-brass">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-sharp border border-line bg-white px-4 py-3 pr-12 text-[15px] text-ink outline-none transition-colors focus:border-ink"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-ink-soft hover:text-ink"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-[14px] text-ink-soft">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded-sharp border-line accent-ink"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-sharp bg-ink py-3.5 text-[15px] font-medium text-paper transition-colors hover:bg-brass-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing In…" : "Sign In"}
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-ink-soft">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-brass-dark hover:text-brass">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
