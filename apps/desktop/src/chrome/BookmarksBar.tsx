import { memo } from "react";
import type { Bookmark } from "../lib/tauri-bridge";
import { IconStar, IconStarFilled } from "../components/icons";

interface BookmarksBarProps {
  bookmarks: Bookmark[];
  activeUrl: string | null;
  onOpen: (url: string) => void;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const BookmarksBar = memo(function BookmarksBar({
  bookmarks,
  activeUrl,
  onOpen,
}: BookmarksBarProps) {
  if (bookmarks.length === 0) return null;

  return (
    <div className="bookmarks-bar">
      {bookmarks.slice(0, 8).map((b) => {
        const host = hostOf(b.url);
        const starred = b.url === activeUrl;
        return (
          <div
            key={b.url}
            className={`bookmark-item${starred ? " is-active" : ""}`}
            title={b.url}
          >
            <button className="bookmark-open" onClick={() => onOpen(b.url)}>
              <span className="bookmark-glyph">{host[0]?.toUpperCase() ?? "•"}</span>
              <span className="bookmark-host">{b.label || host}</span>
            </button>
            <span className="bookmark-pin" role="button" tabIndex={0} title={starred ? "Saved" : ""}>
              {starred ? (
                <IconStarFilled size={12} className="bookmark-star" />
              ) : (
                <IconStar size={12} className="bookmark-star-ghost" />
              )}
            </span>
          </div>
        );
      })}
      {bookmarks.length > 8 && (
        <span className="bookmark-more" title="More saved in history">
          +{bookmarks.length - 8}
        </span>
      )}
    </div>
  );
});