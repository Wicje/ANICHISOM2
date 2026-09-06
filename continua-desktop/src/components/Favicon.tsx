import { faviconUrl } from "../lib/tauri-bridge";

export function Favicon({ url }: { url: string }) {
  if (typeof faviconUrl(url) !== "string") return <span className="tab-favicon">🌐</span>;
  return (
    <img
      className="tab-favicon"
      src={faviconUrl(url)}
      alt=""
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}