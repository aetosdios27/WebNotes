import { notFound } from "next/navigation";
import { settingsSections } from "@/app/components/settings/sections";

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
  // The persistent layout owns the sheet, for direct and in-app visits alike.
  return null;
}
