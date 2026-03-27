"use client";

export function PromptUsageRing({ used, limit }: { used: number; limit: number }) {
  const remaining = Math.max(limit - used, 0);
  const ratio = Math.min(used / limit, 1);
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const isExhausted = remaining === 0;

  return (
    <div
      className="flex items-center gap-1.5"
      title={`${remaining}/${limit} prompts left today (resets at 00:00 UTC)`}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90 shrink-0">
        <circle
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="2.5"
        />
        <circle
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          stroke="currentColor"
          className={isExhausted ? "text-destructive" : "text-foreground"}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`text-xs tabular-nums ${isExhausted ? "text-destructive" : "text-muted-foreground"}`}
      >
        {remaining}/{limit}
      </span>
    </div>
  );
}
