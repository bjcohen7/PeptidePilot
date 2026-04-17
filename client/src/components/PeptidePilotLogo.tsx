interface PeptidePilotLogoProps {
  /** Height in pixels — controls overall scale */
  height?: number;
  /** "light" = white wordmark (for dark backgrounds), "dark" = navy wordmark (for light backgrounds) */
  variant?: "light" | "dark";
}

/**
 * PeptidePilot logo — flex layout so the icon sits pixel-perfect next to the wordmark.
 * The wordmark is a styled <span>; the icon is an inline SVG directly adjacent.
 */
export default function PeptidePilotLogo({
  height = 44,
  variant = "dark",
}: PeptidePilotLogoProps) {
  const wordmarkColor = variant === "light" ? "#ffffff" : "#0f1f3d";
  const hexColor =
    variant === "light" ? "rgba(255,255,255,0.75)" : "rgba(15,31,61,0.45)";

  // Icon SVG dimensions — scales with height
  const iconSize = Math.round(height * 0.82);
  // Compass geometry (all relative to icon centre)
  const cx = iconSize / 2;
  const cy = iconSize / 2;
  const ro = iconSize * 0.40; // outer hex radius
  const ri = iconSize * 0.29; // inner hex radius

  const hexPt = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const angles = [90, 30, -30, -90, -150, 150];
  const outerPts = angles.map(a => hexPt(ro, a));
  const innerPts = angles.map(a => hexPt(ri, a));
  const outerStr = outerPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const innerStr = innerPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const stubLen = iconSize * 0.09;
  const stubs = angles.map((a, i) => {
    const pt = outerPts[i];
    const rad = (a * Math.PI) / 180;
    return {
      x1: pt.x, y1: pt.y,
      x2: pt.x + stubLen * Math.cos(rad),
      y2: pt.y + stubLen * Math.sin(rad),
    };
  });

  const needleReach = iconSize * 0.33;
  const wingX = iconSize * 0.13;
  const wingY = iconSize * 0.16;
  const tip   = { x: cx + needleReach, y: cy - needleReach };
  const tail  = { x: cx - needleReach, y: cy + needleReach };
  const pivot = { x: cx, y: cy };
  const wing  = { x: cx + wingX, y: cy + wingY };

  const fontSize = Math.round(height * 0.82);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        lineHeight: 1,
      }}
      aria-label="PeptidePilot"
      role="img"
    >
      {/* Wordmark */}
      <span
        style={{
          fontFamily: "'Inter', 'DM Sans', -apple-system, sans-serif",
          fontWeight: 700,
          fontSize: `${fontSize}px`,
          letterSpacing: "-0.04em",
          color: wordmarkColor,
          lineHeight: 1,
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        PeptidePilot
      </span>

      {/* Icon — sits flush against wordmark with 2px gap */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox={`0 0 ${iconSize} ${iconSize}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", marginLeft: 2, flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="pp-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#22d3ee" />
            <stop offset="50%"  stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="pp-back" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#0e7490" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>

        {/* Outer hex */}
        <polygon
          points={outerStr}
          stroke={hexColor}
          strokeWidth={Math.max(1, iconSize * 0.033)}
          fill="none"
          strokeLinejoin="round"
        />

        {/* Inner hex */}
        <polygon
          points={innerStr}
          stroke={hexColor}
          strokeWidth={Math.max(0.8, iconSize * 0.022)}
          fill="none"
          strokeLinejoin="round"
          opacity="0.8"
        />

        {/* Bond stubs */}
        {stubs.map((s, i) => (
          <line
            key={i}
            x1={s.x1.toFixed(1)} y1={s.y1.toFixed(1)}
            x2={s.x2.toFixed(1)} y2={s.y2.toFixed(1)}
            stroke={hexColor}
            strokeWidth={Math.max(1, iconSize * 0.033)}
            strokeLinecap="round"
          />
        ))}

        {/* Compass back-face */}
        <polygon
          points={`${pivot.x},${pivot.y} ${wing.x},${wing.y} ${tail.x},${tail.y}`}
          fill="url(#pp-back)"
          opacity="0.5"
        />

        {/* Compass main face */}
        <polygon
          points={`${tip.x},${tip.y} ${pivot.x},${pivot.y} ${tail.x},${tail.y}`}
          fill="url(#pp-grad)"
        />

        {/* Pivot dot */}
        <circle cx={pivot.x} cy={pivot.y} r={iconSize * 0.046} fill="#0f172a" />
        <circle cx={pivot.x} cy={pivot.y} r={iconSize * 0.022} fill="white" opacity="0.9" />
      </svg>
    </div>
  );
}
