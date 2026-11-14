import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, authOptions } from "@/lib/auth";
import { signInDestination, signInError } from "@/lib/signin";
import SignInForm from "./SignInForm";

export const metadata: Metadata = { title: "Sign in · WebNotes" };
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  // Desktop has no auth API or request context; OAuth runs in the hosted app.
  if (process.env.NEXT_PUBLIC_IS_DESKTOP === "true") {
    return <SignInForm desktop providers={[{ id: "google", name: "Google" }]} callbackUrl="/" error={null} />;
  }
  const params = await searchParams;
  const requestHeaders = await headers();
  const origin = `${requestHeaders.get("x-forwarded-proto") === "https" ? "https" : "http"}://${requestHeaders.get("host") ?? "localhost"}`;
  const destination = signInDestination(params.callbackUrl, origin);
  if (await auth()) redirect(destination);
  return (
    <SignInForm
      providers={authOptions.providers.map(({ id, name }) => ({ id, name }))}
      callbackUrl={destination}
      error={params.error ? signInError(params.error) : null}
    />
  );
}
