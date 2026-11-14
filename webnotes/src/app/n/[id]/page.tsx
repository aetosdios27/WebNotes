import Home from "@/app/page";

// A direct visit or refresh at /n/<id> renders the same app; Home reads the id
// from the URL once notes load. In-app navigation never reaches this route: it
// uses shallow pushState. The desktop export has no server, so it prerenders a
// placeholder and Tauri falls back to index.html for real ids.
export function generateStaticParams() {
  return [{ id: "_" }];
}
export default function NotePage() {
  return <Home />;
}
