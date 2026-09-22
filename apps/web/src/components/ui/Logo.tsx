interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Smart Productivity brand mark.
 * A lightning bolt on an indigo gradient — represents fast, AI-powered productivity.
 */
export function LogoMark({ size = 32, className = '' }: LogoProps) {
  const id = `lg-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="Smart Productivity"
    >
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      {/* Lightning bolt */}
      <path
        d="M19.5 4.5L9 18h8.5l-2.5 9.5L27 14h-9.5z"
        fill="white"
        fillOpacity="0.95"
      />
      {/* Small glow dot */}
      <circle cx="25" cy="8" r="2" fill="white" fillOpacity="0.4" />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Full wordmark: icon + text */
export function LogoFull({ size = 32, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={size} />
      <div className="min-w-0">
        <p className="text-sm font-bold text-white leading-tight tracking-tight">Smart Productivity</p>
        <p className="text-[10px] text-slate-500 leading-tight">AI-powered learning</p>
      </div>
    </div>
  );
}
