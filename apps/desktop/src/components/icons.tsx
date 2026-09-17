import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/** Shared svg attribute defaults; spread into each icon's <svg>. */
function svg(p: IconProps): Omit<IconProps, "size"> {
  const { size = 16, ...rest } = p;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...rest,
  };
}

/** Brand mark — a rotated square (the Continua diamond). */
export const IconBrand = (p: IconProps) => (
  <svg
    width={p.size ?? 16}
    height={p.size ?? 16}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    aria-hidden="true"
    {...p}
  >
    <rect x="8.1" y="8.1" width="7.8" height="7.8" rx="2" transform="rotate(45 12 12)" />
  </svg>
);

/** Restore last session — counterclockwise arc. */
export const IconRestore = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M3.5 10a8.5 8.5 0 1 1 1.9 7" />
    <path d="M3 4.5v6h6" />
  </svg>
);

/** Save session to disk — down-arrow into a tray. */
export const IconSave = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 4v9" />
    <path d="M8 9l4 4 4-4" />
    <path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" />
  </svg>
);

/** History — a clock face. */
export const IconClock = (p: IconProps) => (
  <svg {...svg(p)}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.6V12l3.2 2.1" />
  </svg>
);

/** Settings — a knurled knob. */
export const IconSettings = (p: IconProps) => (
  <svg {...svg(p)}>
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.9 1.9M16.7 16.7l1.9 1.9M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9" />
  </svg>
);

/** Clean / focus mode — expand to corners. */
export const IconFocus = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </svg>
);

/** Light theme — sun. */
export const IconSun = (p: IconProps) => (
  <svg {...svg(p)}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
  </svg>
);

/** Dark theme — crescent moon. */
export const IconMoon = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M20 14.6A8.4 8.4 0 1 1 9.4 4a6.7 6.7 0 0 0 10.6 10.6z" />
  </svg>
);

/** Window minimize. */
export const IconMinimize = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M5 12h14" />
  </svg>
);

/** Window maximize. */
export const IconMaximize = (p: IconProps) => (
  <svg {...svg(p)}>
    <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="1.6" />
  </svg>
);

/** Window restore (un-maximize). */
export const IconRestoreWin = (p: IconProps) => (
  <svg {...svg(p)}>
    <rect x="3.8" y="8.4" width="11.8" height="11.8" rx="1.6" />
    <path d="M8.4 8.4V6.2A1.6 1.6 0 0 1 10 4.6h8A1.6 1.6 0 0 1 19.6 6.2v8A1.6 1.6 0 0 1 18 15.8h-2.2" />
  </svg>
);

/** Close / exit. */
export const IconClose = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/** New-tab caret. */
export const IconCaretDown = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M6.5 9.5L12 15l5.5-5.5" />
  </svg>
);

/** New tab. */
export const IconPlus = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Private (incognito) tab — masked face. */
export const IconIncognito = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M4 15.2A3.4 3.4 0 0 1 7.4 11.8h9.2A3.4 3.4 0 0 1 20 15.2c0 1.9-3.4 3.4-8 3.4s-8-1.5-8-3.4z" />
    <path d="M4 15.2 5.8 8.2a2.8 2.8 0 0 1 3.2-2.1l7 1.2" />
    <circle cx="13.4" cy="9.6" r="1.6" />
  </svg>
);

/** Bookmark star (outline). */
export const IconStar = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 3.8l2.5 5.1 5.6.8-4.05 4 .95 5.6L12 16.6l-5 2.7.95-5.6-4.05-4 5.6-.8z" />
  </svg>
);

/** Bookmark star (filled). */
export const IconStarFilled = (p: IconProps) => (
  <svg {...svg(p)} fill="currentColor">
    <path d="M12 3.8l2.5 5.1 5.6.8-4.05 4 .95 5.6L12 16.6l-5 2.7.95-5.6-4.05-4 5.6-.8z" stroke="none" />
  </svg>
);

/** Back within page history. */
export const IconBack = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/** Forward within page history. */
export const IconForward = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

/** Reload — circular arrow. */
export const IconReload = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7" />
    <path d="M18.4 2.8V6.8H14.4" />
  </svg>
);

/** Reader mode — text lines. */
export const IconReader = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M5 6.5h14M5 12h14M5 17.5h9" />
  </svg>
);

/** Invert page to dark. */
export const IconDark = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 3.4a8.6 8.6 0 1 0 0 17.2 7.2 7.2 0 1 1 0-17.2z" />
  </svg>
);

/** Search. */
export const IconSearch = (p: IconProps) => (
  <svg {...svg(p)}>
    <circle cx="11" cy="11" r="6.4" />
    <path d="M20 20l-4.4-4.4" />
  </svg>
);

/** Pin a tab. */
export const IconPin = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M9 4h6l-1.2 5.2 3 3.8H7.2l3-3.8z" />
    <path d="M12 13v7" />
  </svg>
);

/** Duplicate a tab. */
export const IconDuplicate = (p: IconProps) => (
  <svg {...svg(p)}>
    <rect x="8.6" y="8.6" width="11.8" height="11.8" rx="2" />
    <path d="M5.2 15.2H4.9A1.7 1.7 0 0 1 3.2 13.5v-8.3A1.7 1.7 0 0 1 4.9 3.5h8.3a1.7 1.7 0 0 1 1.7 1.7v.4" />
  </svg>
);

/** Open site in a separate app window. */
export const IconAppWindow = (p: IconProps) => (
  <svg {...svg(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 9.4h18" />
    <path d="M6.4 7.1h.01" strokeWidth={2.6} />
  </svg>
);

/** Vault — encrypted at rest (shield). */
export const IconVault = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 3l7 2.6V12c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V5.6z" />
    <path d="M9.2 12l2 2 3.6-4" />
  </svg>
);

/** Generic check. */
export const IconCheck = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M5 13l4.2 4L19 7" />
  </svg>
);

/** Quick-answer equals sign. */
export const IconEquals = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M5 9.2h14M5 14.8h14" />
  </svg>
);

/** Search-suggestion spark. */
export const IconSpark = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 3.4l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z" />
  </svg>
);

/** Copy to clipboard. */
export const IconCopy = (p: IconProps) => (
  <svg {...svg(p)}>
    <rect x="8.6" y="8.6" width="11.8" height="11.8" rx="2" />
    <path d="M5.2 15.2H4.9A1.7 1.7 0 0 1 3.2 13.5v-8.3A1.7 1.7 0 0 1 4.9 3.5h8.3a1.7 1.7 0 0 1 1.7 1.7v.4" />
  </svg>
);

/** Workspaces — stack of layers. */
export const IconStack = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 3.5l8 4.5-8 4.5L4 8z" />
    <path d="M4 13l8 4.5 8-4.5" opacity={0.45} />
  </svg>
);

/** Downloads — down-arrow into tray. */
export const IconDownload = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M12 4v9" />
    <path d="M8 9l4 4 4-4" />
    <path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" />
  </svg>
);

/** Audio playing — speaker with waves. */
export const IconAudio = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M4 10v4h3l4 3.5v-11L7 10z" />
    <path d="M15 9.5a4 4 0 0 1 0 5M17.5 7.5a7 7 0 0 1 0 9" />
  </svg>
);

/** Muted — speaker with cross. */
export const IconMuted = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M4 10v4h3l4 3.5v-11L7 10z" />
    <path d="M15.5 10.5l5 5M20.5 10.5l-5 5" />
  </svg>
);

/** Screenshot — camera. */
export const IconCamera = (p: IconProps) => (
  <svg {...svg(p)}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8.5 7l1.4-2.4h4.2L15.5 7" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
);

/** Print — printer. */
export const IconPrinter = (p: IconProps) => (
  <svg {...svg(p)}>
    <path d="M7 8V3.5h10V8" />
    <rect x="3.5" y="8" width="17" height="8.5" rx="2" />
    <rect x="7" y="13.5" width="10" height="7" rx="1" />
  </svg>
);