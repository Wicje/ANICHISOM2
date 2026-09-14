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
 * Memoized favicon with a one-shot dead-host cache: a bad icon hides itself
 * once and stays hidden for every tab on that host, so tab switching doesn't
 * re-fetch or re-flicker.
 */
export const Favicon = memo(function Favicon({ url }: { url: string }) {
  const [failed, setFailed] = useState<boolean>(() => {
    const host = hostOf(url);
    return host !== null && deadHosts.has(host);
  });

  const src = faviconUrl(url);

  useEffect(() => {
    if (src === "🌐") {
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

  if (failed || src === "🌐") {
    return <span className="tab-favicon">🌐</span>;
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