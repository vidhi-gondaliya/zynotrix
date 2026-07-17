interface AvatarProps {
  name?: string | null;
  image?: string | null;
  size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "rgba(139,92,246,0.18)", text: "#A78BFA", border: "rgba(139,92,246,0.30)" },
  { bg: "rgba(34,211,238,0.15)", text: "#22D3EE", border: "rgba(34,211,238,0.25)" },
  { bg: "rgba(52,211,153,0.15)", text: "#34D399", border: "rgba(52,211,153,0.25)" },
  { bg: "rgba(251,191,36,0.15)", text: "#FBBF24", border: "rgba(251,191,36,0.25)" },
  { bg: "rgba(248,113,113,0.15)", text: "#F87171", border: "rgba(248,113,113,0.25)" },
  { bg: "rgba(96,165,250,0.15)", text: "#60A5FA", border: "rgba(96,165,250,0.25)" },
  { bg: "rgba(244,114,182,0.15)", text: "#F472B6", border: "rgba(244,114,182,0.25)" },
];

function getAvatarColor(name?: string | null) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function Avatar({ name, image, size = "md", className = "", ring }: AvatarProps) {
  const sizes = {
    "2xs": "w-5 h-5 text-[8px]",
    xs:    "w-6 h-6 text-[9px]",
    sm:    "w-7 h-7 text-[10px]",
    md:    "w-8 h-8 text-[11px]",
    lg:    "w-10 h-10 text-xs",
    xl:    "w-12 h-12 text-sm",
  };

  const ringStyle = ring ? { boxShadow: "0 0 0 2px var(--bg-card), 0 0 0 4px var(--accent-glow)" } : undefined;
  const color = getAvatarColor(name);

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name ?? ""}
        className={`${sizes[size]} rounded-full object-cover shrink-0 ${className}`}
        style={ringStyle}
      />
    );
  }

  return (
    <span
      className={`${sizes[size]} rounded-full font-bold inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}`, ...ringStyle }}
    >
      {getInitials(name)}
    </span>
  );
}

/* Stack of avatars */
interface AvatarGroupProps {
  users: Array<{ name?: string | null; image?: string | null }>;
  max?: number;
  size?: "xs" | "sm" | "md";
}

export function AvatarGroup({ users, max = 3, size = "sm" }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className="flex items-center">
      {visible.map((u, i) => (
        <div key={i} className="-ml-1.5 first:ml-0" style={{ zIndex: visible.length - i }}>
          <Avatar name={u.name} image={u.image} size={size} ring
            className="ring-2 ring-card" />
        </div>
      ))}
      {overflow > 0 && (
        <div className="-ml-1.5 z-0">
          <span className="w-7 h-7 rounded-full bg-elevated border border-border text-[10px] font-bold text-muted inline-flex items-center justify-center">
            +{overflow}
          </span>
        </div>
      )}
    </div>
  );
}
