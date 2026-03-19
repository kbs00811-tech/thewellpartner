interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ variant = "light", size = "md", className = "" }: LogoProps) {
  const sizes = {
    sm: { mark: 32, text: "text-[0.95rem]", subtitle: "text-[8px]", gap: "gap-2" },
    md: { mark: 40, text: "text-[1.15rem]", subtitle: "text-[9px]", gap: "gap-2.5" },
    lg: { mark: 50, text: "text-[1.35rem]", subtitle: "text-[10px]", gap: "gap-3" },
  };

  const s = sizes[size];
  const isLight = variant === "light";
  const uid = `logo-${size}-${variant}`;

  return (
    <div className={`flex items-center ${s.gap} select-none ${className}`}>
      <LogoMark id={uid} size={s.mark} />
      <div className="flex flex-col justify-center" style={{ lineHeight: 1.15 }}>
        <span
          className={`${s.text} font-extrabold tracking-[-0.02em]`}
          style={{ color: isLight ? "#0f172a" : "#ffffff" }}
        >
          더웰파트너
        </span>
        <span
          className={`${s.subtitle} tracking-[0.18em] uppercase font-bold`}
          style={{ color: isLight ? "#64748b" : "rgba(255,255,255,0.5)" }}
        >
          THE WELL PARTNER
        </span>
      </div>
    </div>
  );
}

/* ──────────────── LogoMark (Shield + W) ──────────────── */

function LogoMark({ id, size }: { id: string; size: number }) {
  // Shield path - authoritative, slightly taller proportioned
  const shield =
    "M32 3 C32 3 55.5 11 55.5 11 C57.8 11.8 59 13.8 59 16 L59 35 C59 44.5 49.5 52.5 32 61 C14.5 52.5 5 44.5 5 35 L5 16 C5 13.8 6.2 11.8 8.5 11 C8.5 11 32 3 32 3Z";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        {/* Deep corporate navy gradient */}
        <linearGradient id={`${id}-bg`} x1="16" y1="0" x2="52" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0a1a36" />
          <stop offset="40%" stopColor="#0f2b5c" />
          <stop offset="100%" stopColor="#1a4d8f" />
        </linearGradient>

        {/* Subtle top-left highlight for depth */}
        <radialGradient id={`${id}-highlight`} cx="0.3" cy="0.2" r="0.65">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0a1a36" stopOpacity="0" />
        </radialGradient>

        {/* W letter: crisp white to light blue */}
        <linearGradient id={`${id}-w`} x1="22" y1="16" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e4ecf7" />
          <stop offset="100%" stopColor="#b8cde8" />
        </linearGradient>

        {/* Blue accent bar */}
        <linearGradient id={`${id}-accent`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* Outer border: blue tonal */}
        <linearGradient id={`${id}-border`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#1e40af" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.45" />
        </linearGradient>

        {/* Inner shadow for embossed feel */}
        <filter id={`${id}-shadow`} x="-4%" y="-4%" width="108%" height="108%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Drop shadow layer */}
      <g filter={`url(#${id}-shadow)`}>
        <path d={shield} fill={`url(#${id}-bg)`} />
      </g>

      {/* Inner highlight glow */}
      <path d={shield} fill={`url(#${id}-highlight)`} />

      {/* Fine inner border — polished steel feel */}
      <path
        d="M32 5.5 C32 5.5 53.5 12.8 53.5 12.8 C55.2 13.4 56.5 15 56.5 16.8 L56.5 34.5 C56.5 43 47.8 50.5 32 58.5 C16.2 50.5 7.5 43 7.5 34.5 L7.5 16.8 C7.5 15 8.8 13.4 10.5 12.8 C10.5 12.8 32 5.5 32 5.5Z"
        fill="none"
        stroke="rgba(100,170,255,0.08)"
        strokeWidth="0.7"
      />

      {/* Horizontal divider lines — subtle structure */}
      <line x1="15" y1="15" x2="49" y2="15" stroke="rgba(120,180,255,0.05)" strokeWidth="0.5" />
      <line x1="13" y1="47" x2="51" y2="47" stroke="rgba(120,180,255,0.05)" strokeWidth="0.5" />

      {/* "W" lettermark — bold, geometric, confident */}
      <path
        d="M15.5 18.5 L21.2 18.5 L25.8 37.5 L30.2 24.5 L33.8 24.5 L38.2 37.5 L42.8 18.5 L48.5 18.5 L41 46.5 L36.5 46.5 L32 32.5 L27.5 46.5 L23 46.5 Z"
        fill={`url(#${id}-w)`}
      />

      {/* Blue accent bar */}
      <rect
        x="21"
        y="50"
        width="22"
        height="2.5"
        rx="1.25"
        fill={`url(#${id}-accent)`}
      />

      {/* Outer border */}
      <path
        d={shield}
        fill="none"
        stroke={`url(#${id}-border)`}
        strokeWidth="1"
      />
    </svg>
  );
}

/* ──────────────── LogoIcon (compact) ──────────────── */

interface LogoIconProps {
  variant?: "light" | "dark";
  size?: number;
  className?: string;
}

export function LogoIcon({ variant = "light", size = 36, className = "" }: LogoIconProps) {
  const uid = `icon-${variant}-${size}`;
  return <LogoMark id={uid} size={size} />;
}