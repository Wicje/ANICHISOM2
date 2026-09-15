import { memo, useEffect, useState } from "react";
import { faviconUrl } from "../lib/tauri-bridge";

/** Hosts whose icon failed once — don't keep re-requesting broken icons. */
const deadHosts = new Set<string>();

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

/**
 * Deterministic hue (0-359) from a hostname, so every host keeps a stable
 * generated color across tabs and sessions.
 */
const hueOf = (host: string): number => {
  let h = 0;
  for (let i = 0; i < host.length; i++) {
    h = (h * 31 + host.charCodeAt(i)) % 360;
  }
  return h;
};

/** Generated letter-glyph fallback: first character of the host on a
 * deterministic soft-tinted background. Privacy-preserving (ADR-006 #2). */
const Glyph = ({ url }: { url: string }) => {
  const host = hostOf(url);
  const letter = host
    ? host.replace(/^www\./, "").charAt(0).toUpperCase() || "?"
    : "?";
  return (
    <span
      className="tab-favicon favicon-glyph"
      style={{
        background: `hsl(${hueOf(host ?? url)} 60% 38%)`,
        color: "#fff",
        borderRadius: 4,
        fontSize: 10,
        lineHeight: "14px",
        textAlign: "center",
        width: 14,
        height: 14,
      }}
    >
      {letter}
    </span>
  );
};

/**
 * Memoized favicon with a one-shot dead-host cache: a bad icon falls back
 * to the generated glyph once and stays there for every tab on that host,
 * so tab switching doesn't re-fetch or re-flicker.
 */
export const Favicon = memo(function Favicon({ url }: { url: string }) {
  const [failed, setFailed] = useState<boolean>(() => {
    const host = hostOf(url);
    return host !== null && deadHosts.has(host);
  });

  const src = faviconUrl(url);

  useEffect(() => {
    if (src === null) {
      setFailed(true);
      return;
    }
    const host = hostOf(url);
    if (host && deadHosts.has(host)) {
      setFailed(true);
      return;
    }
    let alive = true;
    const probe = new Image();
    probe.referrerPolicy = "no-referrer";
    probe.onload = () => {
      // Only the browser cache warms here; onError below guards the rest.
    };
    probe.onerror = () => {
      if (host) deadHosts.add(host);
      if (alive) setFailed(true);
    };
    probe.src = src;
    return () => {
      alive = false;
    };
  }, [src, url]);

  if (failed || src === null) {
    return <Glyph url={url} />;
  }

  return (
    <img
      className="tab-favicon"
      src={src}
      alt=""
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={(e) => {
        const host = hostOf(url);
        if (host) deadHosts.add(host);
        e.currentTarget.style.visibility = "hidden";
        setFailed(true);
      }}
    />
  );
});
