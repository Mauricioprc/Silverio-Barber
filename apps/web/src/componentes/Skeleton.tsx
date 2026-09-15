export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-base-700 ${className}`} />;
}
