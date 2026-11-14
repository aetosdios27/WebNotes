"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { signIn } from "next-auth/react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import AsciiLogo from "./AsciiLogo";
import styles from "./signin.module.css";

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24.82v7.42h10.53a9 9 0 0 1-3.9 5.9v4.9h6.32c3.7-3.41 5.84-8.43 5.84-14.3Z" />
      <path fill="#34A853" d="M24.82 43.55c5.29 0 9.73-1.75 12.97-4.79l-6.32-4.9c-1.75 1.18-4 1.9-6.65 1.9-5.1 0-9.42-3.44-10.97-8.06H7.32v5.06a19.58 19.58 0 0 0 17.5 10.79Z" />
      <path fill="#FBBC05" d="M13.85 27.7a11.76 11.76 0 0 1 0-7.4v-5.06H7.32a19.55 19.55 0 0 0 0 17.52l6.53-5.06Z" />
      <path fill="#EA4335" d="M24.82 12.24c2.88 0 5.46.99 7.5 2.94l5.62-5.62a18.83 18.83 0 0 0-13.12-5.11 19.58 19.58 0 0 0-17.5 10.79l6.53 5.06c1.55-4.62 5.87-8.06 10.97-8.06Z" />
    </svg>
  );
}

export default function SignInForm({
  providers,
  callbackUrl,
  error,
}: {
  providers: { id: string; name: string }[];
  callbackUrl: string;
  error: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState(error);

  async function start(id: string) {
    setPending(id);
    setFailure(null);
    try {
      await signIn(id, { callbackUrl });
    } catch {
      setFailure("We couldn't connect. Please try again. Your notes on this device are safe.");
      setPending(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="signin-heading">
        <div className={styles.form}>
          <h1 id="signin-heading">Sign in to WebNotes</h1>
          <p className={styles.intro}>Your notes, on every device.</p>

          <div className={styles.actions}>
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`button-primary ${styles.provider}`}
                disabled={pending !== null}
                aria-busy={pending === provider.id}
                onClick={() => void start(provider.id)}
              >
                {pending === provider.id ? (
                  <>
                    <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" />
                    Connecting to {provider.name}…
                  </>
                ) : (
                  <>
                    {provider.id === "google" && <GoogleMark />}
                    Continue with {provider.name}
                  </>
                )}
              </button>
            ))}
            {!providers.length && (
              <p role="status" className={styles.notice}>
                Sign-in isn’t available here yet. Your notes still work on this device.
              </p>
            )}
            {failure && (
              <p role="alert" className={styles.notice}>
                {failure}
              </p>
            )}
            <Button asChild variant="outline" size="lg" className={styles.secondary}>
              <Link href="/">
                Keep writing without an account
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <p className={styles.footnote}>
          Notes you write signed out stay on this device, and sync the first time you sign in.
        </p>
      </section>

      <section className={styles.art} aria-hidden="true">
        <AsciiLogo theme={resolvedTheme} className={styles.canvas} />
      </section>
    </main>
  );
}
