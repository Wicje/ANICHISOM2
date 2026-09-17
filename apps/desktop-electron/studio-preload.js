/** Studio pill preload — exit-only seam (no node in the pill). */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studioPill", {
  exit: () => ipcRenderer.invoke("continua", "set_immersive", { enabled: false }),
});
