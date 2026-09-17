import { memo, useRef } from "react";
import { api } from "../lib/tauri-bridge";
import type { Bookmark } from "../lib/tauri-bridge";
import { IconStar, IconStarFilled } from "../components/icons";

interface BookmarksBarProps {
  bookmarks: Bookmark[];
  activeUrl: string | null;
  onOpen: (url: string) => void;
  onChanged?: (bookmarks: Bookmark[]) => void;
}

/** Parse Netscape bookmark HTML (Chrome/Firefox export): <A HREF="url">title</A> */
export function parseBookmarkHtml(html: string): Array<{ url: string; title: string }> {
  const out: Array<{ url: string; title: string }> = [];
  const re = /<A[^>]+HREF="([^"]+)"[^>]*>([^<]*)</gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 2000) {
    const url = m[1].trim();
    if (/^https?:\/\//i.test(url)) out.push({ url, title: (m[2] || "").trim() || url });
  }
  return out;
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
  onChanged,
}: BookmarksBarProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    const html = await file.text();
    const items = parseBookmarkHtml(html);
    let updated: Bookmark[] = bookmarks;
    for (const it of items.slice(0, 500)) {
      updated = await api.addBookmark(it.url, it.title);
    }
    onChanged?.(updated);
  };

  if (bookmarks.length === 0)
    return (
      <div className="bookmarks-bar is-empty">
        <input ref={fileRef} type="file" accept=".html,text/html" hidden onChange={(e) => void onImportFile(e.target.files?.[0])} />
        <button className="bookmark-import" onClick={() => fileRef.current?.click()} title="Import Chrome/Firefox bookmarks HTML">
          Import bookmarks (Chrome / Firefox HTML)
        </button>
      </div>
    );

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