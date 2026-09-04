import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoMark } from "./Navbar";

export default function DashboardShell({ portalName, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-lg font-semibold text-ink">UniEvents</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-sharp border border-line px-4 py-2 text-[14px] font-medium text-ink transition-colors hover:border-ink"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-3xl font-semibold text-ink">Welcome to the {portalName}</h1>

        <div className="mt-8 max-w-md rounded-sharp border border-line bg-white p-8">
          <dl className="space-y-5">
            <div>
              <dt className="text-[13px] font-medium uppercase tracking-wide text-ink-soft">Name</dt>
              <dd className="mt-1 text-[16px] text-ink">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-[13px] font-medium uppercase tracking-wide text-ink-soft">Email</dt>
              <dd className="mt-1 text-[16px] text-ink">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-[13px] font-medium uppercase tracking-wide text-ink-soft">Role</dt>
              <dd className="mt-1 inline-block rounded-sharp bg-brass/10 px-2.5 py-1 text-[13px] font-medium text-brass-dark">
                {user?.role}
              </dd>
            </div>
          </dl>
        </div>

        {children && <div className="mt-10">{children}</div>}
      </main>
    </div>
  );
}
