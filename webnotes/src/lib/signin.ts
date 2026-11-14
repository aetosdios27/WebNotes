/** Keep OAuth callbacks on this origin and out of authentication loops. */
export function signInDestination(value?: string, origin = "https://webnotes.invalid"): string {
  if (!value) return "/";
  try {
    const base = new URL(origin).origin;
    const url = new URL(value, base);
    if (url.origin !== base || /^\/(?:signin|api\/auth)(?:\/|$)/.test(url.pathname)) return "/";
    return url.pathname + url.search + url.hash;
  } catch { return "/"; }
}

const messages: Record<string, string> = {
  Signin: "We couldn't start sign-in. Please try again.",
  OAuthSignin: "We couldn't connect to your sign-in provider. Please try again.",
  OAuthCallback: "Your provider couldn't complete sign-in. Please try again.",
  OAuthCreateAccount: "We couldn't create your account. Your device notes are safe. Please try again.",
  EmailCreateAccount: "We couldn't create your account with that email. Please try again.",
  Callback: "We couldn't finish sign-in. Please try again.",
  OAuthAccountNotLinked: "This email uses a different sign-in method. Continue with the method you used originally.",
  EmailSignin: "We couldn't send your sign-in link. Please try again.",
  CredentialsSignin: "Those sign-in details weren't recognized. Please try again.",
  SessionRequired: "Sign in to open that page, or return to your device notes.",
  AccessDenied: "Sign-in wasn't allowed. You can try again or keep writing on this device.",
  Verification: "That sign-in link has expired or has already been used. Request a new link.",
  Configuration: "Sign-in is temporarily unavailable. You can keep writing on this device.",
  Default: "Something interrupted sign-in. Please try again. Your device notes are safe.",
};
export function signInError(code: string): string { return Object.hasOwn(messages, code) ? messages[code] : messages.Default; }
