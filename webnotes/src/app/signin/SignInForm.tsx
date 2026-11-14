"use client";

import { useTheme } from "next-themes";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import AsciiFlow from "../components/ascii/AsciiFlow";
import styles from "./signin.module.css";

const lightArt = { background: "#edece5", foreground: "#30332d" };
const darkArt = { background: "#171a16", foreground: "#e7e7dc" };

export default function SignInForm({ providers, callbackUrl, error }: {
  providers: { id: string; name: string }[]; callbackUrl: string; error: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState(error);
  async function start(id: string) {
    setPending(id); setFailure(null);
    try { await signIn(id, { callbackUrl }); }
    catch { setFailure("We couldn't connect. Please try again. Your device notes are safe."); setPending(null); }
  }
  return <main className={styles.page}>
    <div className={styles.card}>
    <section className={styles.art} aria-label="WebNotes">
      <AsciiFlow maskImage="/logo-traced.svg" palette={resolvedTheme === "dark" ? darkArt : lightArt} className={styles.canvas} />
      <p className={styles.caption}>A little space for your thoughts.</p>
    </section>
    <section className={styles.right} aria-labelledby="signin-heading">
      <Link href="/" className={styles.back}><ArrowLeft size={16} /> Back to your notes</Link>
      <div className={styles.form}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-traced.svg" alt="" width="39" height="18" className={styles.mark} />
        <h1 id="signin-heading">Sign in to WebNotes</h1>
        <p className={styles.intro}>Your notes, on every device.</p>
        <div className={styles.actions}>
          {providers.map(provider => <button key={provider.id} type="button" className={styles.primary}
            disabled={pending !== null} aria-busy={pending === provider.id} onClick={() => void start(provider.id)}>
            {pending === provider.id ? <><LoaderCircle size={18} className={styles.spinner} /> Connecting to {provider.name}…</> : <>{provider.id === "google" && <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24.82v7.42h10.53a9 9 0 0 1-3.9 5.9v4.9h6.32c3.7-3.41 5.84-8.43 5.84-14.3Z" />
              <path fill="#34A853" d="M24.82 43.55c5.29 0 9.73-1.75 12.97-4.79l-6.32-4.9c-1.75 1.18-4 1.9-6.65 1.9-5.1 0-9.42-3.44-10.97-8.06H7.32v5.06a19.58 19.58 0 0 0 17.5 10.79Z" />
              <path fill="#FBBC05" d="M13.85 27.7a11.76 11.76 0 0 1 0-7.4v-5.06H7.32a19.55 19.55 0 0 0 0 17.52l6.53-5.06Z" />
              <path fill="#EA4335" d="M24.82 12.24c2.88 0 5.46.99 7.5 2.94l5.62-5.62a18.83 18.83 0 0 0-13.12-5.11 19.58 19.58 0 0 0-17.5 10.79l6.53 5.06c1.55-4.62 5.87-8.06 10.97-8.06Z" />
            </svg>}Continue with {provider.name}</>}
          </button>)}
          {!providers.length && <p role="status" className={styles.notice}>Sign-in isn’t available here yet. Your notes still work on this device.</p>}
          {failure && <p role="alert" className={styles.notice}>{failure}</p>}
        </div>
        <p className={styles.explanation}>Your local notes will sync when you sign in.</p>
        <Link href="/" className={styles.local}>Just keep writing <ArrowRight size={16} /></Link>
      </div>
    </section>
    </div>
  </main>;
}
