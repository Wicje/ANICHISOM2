// Prevents an additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Compositing safety, daily-driver default. WebKitGTK's DMABUF renderer is
    // known to present a blank black window on several Wayland compositors
    // (incl. threading river/community sessions). Correctness-first: we default
    // to the software/relayout-safe path and treat DMABUF as an explicit,
    // measured opt-in for compositors that can present it.
    //   CONTINUA_GPU_DMABUF=1             -> re-enable the DMABUF renderer
    //   CONTINUA_GPU_FORCE_COMPOSITING=1  -> WEBKIT_FORCE_COMPOSITING_MODE=1
    if std::env::var("CONTINUA_GPU_DMABUF").unwrap_or_default().as_str() != "1" {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    if std::env::var("CONTINUA_GPU_FORCE_COMPOSITING").is_ok() {
        std::env::set_var("WEBKIT_FORCE_COMPOSITING_MODE", "1");
    }
    continua_desktop_lib::run()
}