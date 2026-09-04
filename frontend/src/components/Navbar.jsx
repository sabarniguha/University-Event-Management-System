import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            UniEvents
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[15px] text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => navigate("/login")}
            className="px-3 py-2 text-[15px] font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/login")}
            className="rounded-sharp bg-ink px-5 py-2.5 text-[15px] font-medium text-paper transition-colors hover:bg-brass-dark"
          >
            Get Started
          </button>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <HamburgerIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-paper px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-[15px] text-ink-soft"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-line pt-4">
              <button
                onClick={() => navigate("/login")}
                className="rounded-sharp border border-line px-4 py-2.5 text-[15px] font-medium text-ink"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/login")}
                className="rounded-sharp bg-ink px-4 py-2.5 text-[15px] font-medium text-paper"
              >
                Get Started
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function LogoMark({ light = false }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 3L25 8.5V13C25 19.5 20.5 24.5 14 26C7.5 24.5 3 19.5 3 13V8.5L14 3Z"
        stroke={light ? "#EFF1EC" : "#141F38"}
        strokeWidth="1.6"
      />
      <path d="M9 13.5L12.5 17L19.5 10" stroke="#B3872E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HamburgerIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {open ? (
        <path d="M5 5L17 17M17 5L5 17" stroke="#141F38" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <>
          <path d="M3 6H19" stroke="#141F38" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3 11H19" stroke="#141F38" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3 16H19" stroke="#141F38" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
