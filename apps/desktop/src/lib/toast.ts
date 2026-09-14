export type ToastKind = "info" | "success" | "danger";

export interface ToastMsg {
  id: number;
  text: string;
  kind: ToastKind;
}

let seq = 0;

/** Fire a toast; the <Toasts /> host (mounted in App) renders it. */
export function toast(text: string, kind: ToastKind = "info"): void {
  window.dispatchEvent(
    new CustomEvent<ToastMsg>("continua:toast", {
      detail: { id: ++seq, text, kind },
    }),
  );
}