export function Logo({ className = "text-lg" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      Sport<span className="text-brand-600">Sync</span>
    </span>
  );
}
