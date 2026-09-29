import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useChromeModal } from "../lib/chrome-modal";
import { IconClose } from "../components/icons";

interface QrPanelProps {
  open: boolean;
  url: string;
  onClose: () => void;
}

/** Big offline QR for the current page — scan with the phone camera. */
export function QrPanel({ open, url, onClose }: QrPanelProps) {
  const [img, setImg] = useState("");
  useChromeModal("qr", open);

  useEffect(() => {
    if (!open || !url) return;
    setImg("");
    let live = true;
    QRCode.toDataURL(url, { width: 240, margin: 1 })
      .then((d) => {
        if (live) setImg(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, url]);

  if (!open) return null;

  return (
    <div className="downloads-overlay" onMouseDown={onClose}>
      <div
        className="downloads-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Page QR code"
        style={{ alignItems: "center", textAlign: "center" }}
      >
        <div className="downloads-head" style={{ alignSelf: "stretch" }}>
          <span className="downloads-title">Scan to open on your phone</span>
          <button className="downloads-close" onClick={onClose} title="Close">
            <IconClose size={14} />
          </button>
        </div>
        {img ? (
          <img src={img} alt={`QR code for ${url}`} width={240} height={240} style={{ borderRadius: 8, background: "#fff", padding: 8 }} />
        ) : (
          <p className="downloads-empty">Generating…</p>
        )}
        <p className="downloads-empty" style={{ wordBreak: "break-all" }}>{url}</p>
      </div>
    </div>
  );
}
