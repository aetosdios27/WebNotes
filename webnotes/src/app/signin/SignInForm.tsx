"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import AsciiFlow from "../components/ascii/AsciiFlow";
import styles from "./signin.module.css";

export default function SignInForm({ providers, callbackUrl, error }: {
  providers: { id: string; name: string }[]; callbackUrl: string; error: string | null;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState(error);
  async function start(id: string) {
    setPending(id); setFailure(null);
    try { await signIn(id, { callbackUrl }); }
    catch { setFailure("We couldn't connect. Please try again. Your device notes are safe."); setPending(null); }
  }
  return <main className={styles.page}>
    <section className={styles.art} aria-label="WebNotes">
      <span className={styles.wordmark}>webnotes</span>
      <AsciiFlow maskImage="/logo-traced.svg" className={styles.canvas} />
      <p className={styles.caption}>A little space for everything on your mind.</p>
    </section>
    <section className={styles.right} aria-labelledby="signin-heading">
      <Link href="/" className={styles.back}><ArrowLeft size={16} /> Back to your notes</Link>
      <div className={styles.form}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-traced.svg" alt="" width="64" height="28" className={styles.mark} />
        <h1 id="signin-heading">Sign in to WebNotes</h1>
        <p className={styles.intro}>Your notes, on every device.</p>
        <div className={styles.actions}>
          {providers.map(provider => <button key={provider.id} type="button" className={styles.primary}
            disabled={pending !== null} aria-busy={pending === provider.id} onClick={() => void start(provider.id)}>
            {pending === provider.id ? <><LoaderCircle size={18} className={styles.spinner} /> Connecting to {provider.name}…</> : <>Continue with {provider.name}<ArrowRight size={18} /></>}
          </button>)}
          {!providers.length && <p role="status" className={styles.notice}>Sign-in isn’t available here yet. Your notes still work on this device.</p>}
          {failure && <p role="alert" className={styles.notice}>{failure}</p>}
        </div>
        <p className={styles.explanation}>The notes on this device will sync to your account when you sign in.</p>
        <Link href="/" className={styles.local}>Just keep writing <ArrowRight size={15} /></Link>
      </div>
      <p className={styles.foot}>No account needed to make room for a thought.</p>
    </section>
  </main>;
}
