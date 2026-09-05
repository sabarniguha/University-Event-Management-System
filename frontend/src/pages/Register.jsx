
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { LogoMark } from "../components/Navbar";

const ROLE_CONFIG = {
  student: {
    role: "STUDENT",
    title: "Create Student Account",
    subtitle: "Join UniEvents and discover university events.",
    requiresStudentId: true,
  },
  organizer: {
    role: "ORGANIZER",
    title: "Create Organizer Account",
    subtitle: "Create and manage events for the university community.",
    requiresStudentId: false,
  },
  admin: {
    role: "ADMIN",
    title: "Create Administrator Account",
    subtitle: "Set up your UniEvents administrator account.",
    requiresStudentId: false,
  },
};

const initialForm = {
  name: "",
  email: "",
  studentId: "",
  department: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function Register() {
  const { type } = useParams();
  const navigate = useNavigate();

  const config = ROLE_CONFIG[type] || ROLE_CONFIG.student;

  const [form, setForm] = useState(initialForm);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field) {
    return (e) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };
  }

  function validate() {
    if (!form.name.trim()) {
      return "Please enter your full name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Please enter a valid email.";
    }

    if (config.requiresStudentId && !form.studentId.trim()) {
      return "Please enter your Student ID.";
    }

    if (!form.department.trim()) {
      return "Please enter your department.";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }

    if (!agreed) {
      return "Please accept the Terms and Conditions to continue.";
    }

    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        studentId: config.requiresStudentId
          ? form.studentId.trim()
          : undefined,
        department: form.department.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: config.role,
      });

      // After successful registration, send the user
      // to the correct role-specific login page.
      navigate(`/login/${type || "student"}`, {
        state: {
          registered: true,
        },
      });
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper px-6 py-12">
      <div className="mx-auto max-w-md">
        {/* Logo */}
        <Link
          to="/"
          className="mb-10 flex items-center justify-center gap-2"
        >
          <LogoMark />

          <span className="font-display text-xl font-semibold text-ink">
            UniEvents
          </span>
        </Link>

        {/* Registration Card */}
        <div className="rounded-sharp border border-line bg-white p-8 sm:p-10">
          {/* Heading */}
          <h1 className="text-center font-display text-2xl font-semibold text-ink">
            {config.title}
          </h1>

          <p className="mt-2 text-center text-[14px] leading-relaxed text-ink-soft">
            {config.subtitle}
          </p>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-sharp border border-maroon/30 bg-maroon/5 px-4 py-3 text-[14px] text-maroon">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {/* Full Name */}
            <Field
              label="Full Name"
              id="name"
              value={form.name}
              onChange={updateField("name")}
              autoComplete="name"
            />

            {/* Email */}
            <Field
              label="University Email"
              id="email"
              type="email"
              value={form.email}
              onChange={updateField("email")}
              autoComplete="email"
            />

            {/* Student ID - Student only */}
            {config.requiresStudentId && (
              <Field
                label="Student ID"
                id="studentId"
                value={form.studentId}
                onChange={updateField("studentId")}
              />
            )}

            {/* Department */}
            <Field
              label="Department"
              id="department"
              value={form.department}
              onChange={updateField("department")}
            />

            {/* Phone */}
            <Field
              label="Phone"
              id="phone"
              type="tel"
              value={form.phone}
              onChange={updateField("phone")}
              autoComplete="tel"
            />

            {/* Password */}
            <Field
              label="Password"
              id="password"
              type="password"
              value={form.password}
              onChange={updateField("password")}
              autoComplete="new-password"
            />

            {/* Confirm Password */}
            <Field
              label="Confirm Password"
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={updateField("confirmPassword")}
              autoComplete="new-password"
            />

            {/* Terms */}
            <label className="flex items-start gap-2 text-[13px] text-ink-soft">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-sharp border-line accent-ink"
              />

              <span>
                I agree to the Terms and Conditions.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-sharp bg-ink py-3.5 text-[15px] font-medium text-paper transition-colors hover:bg-brass-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating Account…" : "Create Account"}
            </button>
          </form>

          {/* Login */}
          <p className="mt-6 text-center text-[14px] text-ink-soft">
            Already have an account?{" "}
            <Link
              to={`/login/${type || "student"}`}
              className="font-medium text-brass-dark hover:text-brass"
            >
              Sign In
            </Link>
          </p>

          {/* Change Account Type */}
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
  );
}

function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  autoComplete,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[14px] font-medium text-ink"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-sharp border border-line bg-white px-4 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-ink"
      />
    </div>
  );
}

