import type { Metadata } from "next";
import HomeGate from "./components/landing/HomeGate";

const description =
  "A place for your notes. Write offline, link ideas with [[, and sync across devices when you sign in.";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://web-notes-lyart.vercel.app"),
  ),
  title: "WebNotes — A thought. A place for it.",
  description,
  openGraph: {
    title: "WebNotes — A thought. A place for it.",
    description,
    type: "website",
    images: [
      { url: "/icons/icon-512.png", width: 512, height: 512, alt: "WebNotes" },
    ],
  },
};

export default function Home() {
  return <HomeGate />;
}
