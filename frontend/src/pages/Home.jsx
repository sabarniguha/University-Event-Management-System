import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import EventPassStack from "../components/EventPassStack";

const AUDIENCES = [
  {
    tag: "STUDENT",
    title: "Discover and participate",
    body: "Students can discover events, register, manage their registrations and participate in university activities.",
  },
  {
    tag: "ORGANIZER",
    title: "Create and manage",
    body: "Organizers can create events, manage participants and track attendance.",
  },
  {
    tag: "ADMIN",
    title: "Control and coordinate",
    body: "Administrators can review events, manage users and oversee university-wide activities.",
  },
];

const STEPS = [
  { title: "Discover", body: "Find events happening around your university." },
  { title: "Register", body: "Register for events in just a few clicks." },
  { title: "Participate", body: "Attend events and stay connected with campus life." },
];

const FEATURES = [
  { title: "Event Discovery", body: "Browse everything happening on campus in one searchable place." },
  { title: "Easy Registration", body: "Register for events in a few clicks, no forms to chase down." },
  { title: "Event Management", body: "Organizers manage participants and details from a single dashboard." },
  { title: "QR Attendance", body: "Check-in with a scan instead of a paper sign-in sheet." },
  { title: "Notifications", body: "Stay updated when events change, open, or start soon." },
  { title: "Certificates", body: "Participation certificates generated automatically." },
  { title: "Analytics", body: "Administrators see turnout and engagement across the university." },
];

const WITHOUT = [
  "Scattered event information",
  "Manual registration",
  "Difficult attendance tracking",
  "Missed announcements",
  "No centralized event history",
];

const WITH = [
  "One event platform",
  "Simple online registration",
  "QR-based attendance",
  "Centralized notifications",
  "Organized event management",
];

const ROLES = [
  {
    title: "For Students",
    body: "Discover events and participate in campus life.",
    cta: "Explore as Student",
  },
  {
    title: "For Organizers",
    body: "Create, manage and track your university events.",
    cta: "Organize Events",
  },
  {
    title: "For Administrators",
    body: "Manage university events and keep everything organized.",
    cta: "Admin Portal",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      {/* HERO */}
      <section id="home" className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Your University's Events, All in One Place.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              Discover university events, register with ease, and stay connected with everything happening on campus.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/login")}
                className="rounded-sharp bg-ink px-6 py-3.5 text-[15px] font-medium text-paper transition-colors hover:bg-brass-dark"
              >
                Explore Events
              </button>
              <button
                onClick={() => navigate("/login")}
                className="rounded-sharp border border-line px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-ink"
              >
                Get Started
              </button>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <EventPassStack />
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="border-t border-line bg-white/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-ink">What is UniEvents?</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
              UniEvents is a centralized platform designed to simplify how universities organize, discover, and
              participate in events. Instead of students searching through multiple WhatsApp groups, notice boards,
              social media pages, and emails, UniEvents brings university events into one organized platform.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-sharp border border-line bg-line sm:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.tag} className="bg-paper p-8">
                <span className="text-xs font-semibold tracking-wide text-brass">{a.tag}</span>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">{a.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-semibold text-ink">How It Works</h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative border-l-2 border-brass pl-6">
                <span className="font-display text-sm text-brass">0{i + 1}</span>
                <h3 className="mt-2 font-display text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-line bg-white/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-semibold text-ink">Key Features</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-sharp border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-paper p-7">
                <h3 className="font-display text-lg font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY UNIEVENTS */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="max-w-xl font-display text-3xl font-semibold text-ink">
            Everything Your University Needs for Better Events
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="rounded-sharp border border-line p-8">
              <h3 className="font-body text-sm font-semibold uppercase tracking-wide text-ink-soft">
                Without UniEvents
              </h3>
              <ul className="mt-5 space-y-3">
                {WITHOUT.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] text-ink-soft">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-soft/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-sharp border border-brass/40 bg-ink p-8">
              <h3 className="font-body text-sm font-semibold uppercase tracking-wide text-brass">
                With UniEvents
              </h3>
              <ul className="mt-5 space-y-3">
                {WITH.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] text-paper/90">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROLE SECTION */}
      <section className="border-t border-line bg-white/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-semibold text-ink">Built for Everyone on Campus</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {ROLES.map((role) => (
              <div key={role.title} className="flex flex-col justify-between rounded-sharp border border-line p-8">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">{role.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{role.body}</p>
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="mt-6 self-start text-[14px] font-medium text-brass-dark hover:text-brass"
                >
                  {role.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-display text-3xl font-semibold text-paper sm:text-4xl">Ready to Get Involved?</h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] text-paper/60">
            Discover what's happening at your university today.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-8 rounded-sharp bg-brass px-8 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-brass-light"
          >
            Get Started
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
