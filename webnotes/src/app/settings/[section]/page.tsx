import { notFound } from "next/navigation";
import { settingsSections } from "@/app/components/settings/sections";
import Home from "@/app/page";

export const dynamicParams = false;
export function generateStaticParams() {
  return settingsSections.map(({ id }) => ({ section: id }));
}
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!settingsSections.some(({ id }) => id === section)) notFound();
  // The persistent layout owns the sheet. A direct visit or a refresh still
  // shows the notes app behind it, exactly as when opened from inside the app.
  return <Home />;
}
