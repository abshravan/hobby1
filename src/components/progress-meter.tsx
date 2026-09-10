import type { Progress } from "@/lib/checklist";

/** Thin horizontal bar. `tone` picks the fill against light vs dark ground. */
export function ProgressMeter({
  progress,
  tone = "default",
  className = "",
}: {
  progress: Progress;
  tone?: "default" | "inverted";
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={progress.percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${progress.completed} of ${progress.total} complete`}
      className={`h-1.5 w-full overflow-hidden rounded-full ${
        tone === "inverted" ? "bg-parchment/25" : "bg-parchment-200"
      } ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${
          tone === "inverted" ? "bg-parchment" : "bg-ember-500"
        }`}
        style={{ width: `${progress.percent}%` }}
      />
    </div>
  );
}
