import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoMark } from "../components/Navbar";
import EventPassStack from "../components/EventPassStack";

const DASHBOARD_BY_ROLE = {
  STUDENT: "/student/dashboard",
  ORGANIZER: "/organizer/dashboard",
  ADMIN: "/admin/dashboard",
};

const ROLE_CONFIG = {
  student: {
    role: "STUDENT",
    title: "Student Login",
    subtitle:
      "Sign in to discover and participate in university events.",
  },
  organizer: {
    role: "ORGANIZER",
    title: "Organizer Login",
    subtitle:
      "Sign in to manage and organize university events.",
  },
  admin: {
    role: "ADMIN",
    title: "Administrator Login",
    subtitle:
      "Sign in to manage UniEvents administration.",
  },
};

export default function Login() {
  const { type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  const config = ROLE_CONFIG[type] || ROLE_CONFIG.student;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const registeredSuccessfully = location.state?.registered === true;

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

      // Make sure the account matches the selected login type.
      if (user.role !== config.role) {
        logout();

        setError(
          `This account is not registered as a ${config.role.toLowerCase()} account.`
        );

        return;
      }

      const redirectTo =
        location.state?.from?.pathname ||
        DASHBOARD_BY_ROLE[user.role] ||
        "/";

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark />

            <span className="font-display text-xl font-semibold text-ink">
              UniEvents
            </span>
          </Link>

          <Link
            to="/login"
            className="text-[14px] text-ink-soft transition-colors hover:text-ink"
          >
            Change Account Type
          </Link>
        </div>

        <div className="grid min-h-[calc(100vh-150px)] items-center gap-12 py-12 lg:grid-cols-2">
          {/* Left side */}
          <div className="hidden lg:block">
            <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-brass-dark">
              UniEvents
            </p>

            <h1 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-tight text-ink">
              University events,
              <br />
              all in one place.
            </h1>

            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-ink-soft">
              Discover events, connect with your university community,
              and make every campus experience count.
            </p>

            <div className="mt-10">
              <EventPassStack />
            </div>
          </div>

          {/* Login Card */}
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-sharp border border-line bg-white p-8 sm:p-10">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-brass-dark">
                  Account Access
                </p>

                <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
                  {config.title}
                </h2>

                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  {config.subtitle}
                </p>
              </div>

              {/* Registration success */}
              {registeredSuccessfully && !error && (
                <div className="mt-6 rounded-sharp border border-green-600/30 bg-green-50 px-4 py-3 text-[14px] text-green-700">
                  Account created successfully. Please sign in to
                  continue.
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-6 rounded-sharp border border-maroon/30 bg-maroon/5 px-4 py-3 text-[14px] text-maroon">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[14px] font-medium text-ink"
                  >
                    University Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@university.edu"
                    className="mt-1.5 w-full rounded-sharp border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-ink"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-[14px] font-medium text-ink"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-[13px] text-brass-dark hover:text-brass"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative mt-1.5">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="w-full rounded-sharp border border-line bg-white px-4 py-3 pr-20 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-ink"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-ink-soft hover:text-ink"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label className="flex items-center gap-2 text-[13px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-sharp border-line accent-ink"
                  />

                  <span>Remember me</span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-sharp bg-ink py-3.5 text-[15px] font-medium text-paper transition-colors hover:bg-brass-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Signing In…" : "Sign In"}
                </button>
              </form>

              {/* Signup */}
              <p className="mt-7 text-center text-[14px] text-ink-soft">
                Don't have an account?{" "}
                <Link
                  to={`/register/${type || "student"}`}
                  className="font-medium text-brass-dark hover:text-brass"
                >
                  Create Account
                </Link>
              </p>

              {/* Change role */}
              <p className="mt-4 text-center text-[13px] text-ink-soft">
                <Link
                  to="/login"
                  className="text-brass-dark hover:text-brass"
                >
                  ← Choose another account type
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
