import { Arc } from "loading-dev";

/** The app's one waiting indicator. It takes the colour of the text around it. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Arc size={size} cap="round" className={className} />;
}
