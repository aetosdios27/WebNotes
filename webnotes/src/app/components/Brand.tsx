import { cn } from "@/lib/utils";
export default function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5 text-ink", className)}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 160 70"
        className="h-4 w-9 fill-current shrink-0"
      >
        <path d="M0 1H35V34L97 0V34L33 69H0Z" />
        <path d="M98 34L160 0V34L98 69Z" />
      </svg>
      <span className="font-sans font-semibold tracking-[-0.035em]">
        webnotes
      </span>
    </span>
  );
}
