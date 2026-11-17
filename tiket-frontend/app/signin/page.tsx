import type React from "react";
import { useState, useEffect } from "react";
import {
  useNavigate,
  Link,
  getRouteApi,
} from "@tanstack/react-router";
import styles from "./Signin.module.css";
import { UserRoundKey } from "lucide-react";
import { FaEye } from "react-icons/fa";
import { IoEyeOff } from "react-icons/io5";
import { BeatLoader } from "react-spinners";
import { useAuth } from "@/hooks/useAuth";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const routeApi = getRouteApi("/signin");

export default function SigninPage() {
  const navigate = useNavigate();
  const search = (routeApi.useSearch() || {}) as {
    redirect?: string;
    error?: string;
  };
  const returnTo = () => {
    const path = search.redirect;
    return path?.startsWith("/") &&
      !path.startsWith("//") &&
      !path.includes("\\")
      ? path
      : "/home";
  };
  const { verifyOtp, sendOtp, loginWithPassword, isLoading, error, setError } =
    useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");

  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [showPassword, setShowPassword] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    const errParam = search.error;
    if (errParam === "unverified_google_email") {
      setError(
        "Your Google account email is not verified. Please verify it or sign in with another method.",
      );
    } else if (errParam === "oauth_state_invalid") {
      setError(
        "Google sign-in session expired or was invalid. Please try again.",
      );
    } else if (errParam) {
      setError("Google sign-in was cancelled or failed. Please try again.");
    }
  }, [search.error, setError]);

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (otpSent) {
      if (!otp) return;
      const res = await verifyOtp(email, otp);
      if (res.success) {
        navigate({ to: returnTo() });
      }
      return;
    }

    const res = await sendOtp(email, needsName ? name : undefined);
    if (res.needsName) {
      setNeedsName(true);
    } else if (res.success) {
      setOtpSent(true);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const res = await loginWithPassword(
      email,
      password,
      needsName ? name : undefined,
    );
    if (res.needsName) {
      setNeedsName(true);
    } else if (res.success) {
      navigate({ to: returnTo() });
    }
  };

  const isPasswordMode = mode === "password";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Tiket<span className={styles.dot}>.</span>
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.iconWrap}>
              <UserRoundKey size={20} />
            </div>

            <h1 className={styles.title}>Your tickets, your way.</h1>
            <p className={styles.subtitle}>
              Sign in to manage and discover events near you.
            </p>

            {error && <p className={styles.error}>*{error}</p>}

            <form
              onSubmit={isPasswordMode ? handlePassword : handleOtp}
              className={styles.form}
            >
              {!otpSent && (
                <>
                  <label htmlFor="email" className={styles.label}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setNeedsName(false);
                    }}
                    required
                    className={styles.input}
                    autoComplete="email"
                    disabled={needsName}
                  />

                  {needsName && (
                    <div style={{ marginTop: "1rem" }}>
                      <label htmlFor="name" className={styles.label}>
                        Full Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className={styles.input}
                        autoComplete="name"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => {
                      setMode(isPasswordMode ? "otp" : "password");
                      setError("");
                    }}
                    disabled={needsName}
                  >
                    {isPasswordMode
                      ? "Use email OTP instead"
                      : "Sign in with Password"}
                  </button>

                  <div
                    className={`${styles.passwordSection} ${isPasswordMode ? styles.passwordVisible : ""}`}
                  >
                    <div>
                      <label htmlFor="password" className={styles.label}>
                        Password
                      </label>
                      <div className={styles.inputWrap}>
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required={isPasswordMode}
                          className={styles.input}
                          autoComplete="current-password"
                          tabIndex={isPasswordMode ? 0 : -1}
                        />
                        <button
                          type="button"
                          className={styles.eyeBtn}
                          onClick={() => setShowPassword((v) => !v)}
                          tabIndex={isPasswordMode ? 0 : -1}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <IoEyeOff size={18} />
                          ) : (
                            <FaEye size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {otpSent && (
                <div>
                  <label htmlFor="otp" className={styles.label}>
                    6-Digit OTP
                  </label>
                  <input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    className={styles.input}
                    autoComplete="one-time-code"
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setError("");
                    }}
                  >
                    Change Email
                  </button>
                </div>
              )}

              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <BeatLoader size={8} color="var(--color-bg-base)" />
                ) : otpSent ? (
                  "Verify OTP"
                ) : needsName ? (
                  "Continue to Register"
                ) : isPasswordMode ? (
                  "Sign in with Password"
                ) : (
                  "Continue with Email"
                )}
              </button>
            </form>
          </div>
          <div className={styles.divider} />

          <div className={styles.socialGroup}>
            <GoogleSignInButton
              redirect={returnTo()}
              onError={(err) => setError(err)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
