import { Link } from "react-router-dom";
import { LogoMark } from "./Navbar";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <LogoMark light />
              <span className="font-display text-lg font-semibold">UniEvents</span>
            </div>
            <p className="mt-3 text-sm text-paper/60">Discover. Register. Participate.</p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <h4 className="font-body text-sm font-semibold text-paper/90">Platform</h4>
              <ul className="mt-3 space-y-2 text-sm text-paper/60">
                <li>
                  <a href="#home" className="hover:text-paper">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-paper">
                    About
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-paper">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-body text-sm font-semibold text-paper/90">Account</h4>
              <ul className="mt-3 space-y-2 text-sm text-paper/60">
                <li>
                  <Link to="/login" className="hover:text-paper">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-paper">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-body text-sm font-semibold text-paper/90">Contact</h4>
              <ul className="mt-3 space-y-2 text-sm text-paper/60">
                <li>support@unievents.edu</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-paper/10 pt-6 text-xs text-paper/40">
          © 2026 UniEvents. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
