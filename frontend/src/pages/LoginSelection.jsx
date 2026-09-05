import { Link } from "react-router-dom";
import { LogoMark } from "../components/Navbar";

const roles = [
  {
    type: "student",
    title: "Student",
    description:
      "Discover university events, register for activities, and manage your participation.",
    icon: "🎓",
  },
  {
    type: "organizer",
    title: "Organizer",
    description:
      "Create, manage, and organize events for the university community.",
    icon: "📋",
  },
  {
    type: "admin",
    title: "Administrator",
    description:
      "Manage users, events, and the UniEvents platform.",
    icon: "🛡️",
  },
];

export default function LoginSelection() {
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
            to="/"
            className="text-[14px] text-ink-soft transition-colors hover:text-ink"
          >
            Back to Home
          </Link>
        </div>

        {/* Heading */}
        <div className="mx-auto mt-20 max-w-2xl text-center">
          <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-brass-dark">
            UniEvents
          </p>

          <h1 className="mt-3 font-display text-4xl font-semibold text-ink sm:text-5xl">
            Welcome to UniEvents
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            Choose your account type to sign in or create a new
            UniEvents account.
          </p>
        </div>

        {/* Role Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.type}
              className="rounded-sharp border border-line bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:border-ink hover:shadow-lg"
            >
              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-sharp border border-line bg-paper text-2xl">
                {role.icon}
              </div>

              {/* Role */}
              <h2 className="mt-6 font-display text-2xl font-semibold text-ink">
                {role.title}
              </h2>

              {/* Description */}
              <p className="mt-3 min-h-[72px] text-[14px] leading-relaxed text-ink-soft">
                {role.description}
              </p>

              {/* Buttons */}
              <div className="mt-7 grid grid-cols-2 gap-3">
                <Link
                  to={`/login/${role.type}`}
                  className="rounded-sharp bg-ink px-4 py-3 text-center text-[14px] font-medium text-paper transition-colors hover:bg-brass-dark"
                >
                  Sign In
                </Link>

                <Link
                  to={`/register/${role.type}`}
                  className="rounded-sharp border border-line px-4 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:border-ink hover:bg-paper"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Footer message */}
        <div className="mt-12 text-center">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Select the account type that matches your role in the
            university community.
          </p>
        </div>
      </div>
    </div>
  );
}
