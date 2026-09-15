// Prevents an additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // A/B tooling levers for the GPU/compositing self-test. Default-off: the
    // compositor is already threaded/accelerated on WebKitGTK, but forcing the
    // mode (or the software fallback for DMABUF) lets the suite measure the
    // differential on real hardware instead of assuming.
    //   CONTINUA_GPU_FORCE_COMPOSITING=1  -> WEBKIT_FORCE_COMPOSITING_MODE=1
    //   CONTINUA_GPU_A_B=1                -> WEBKIT_DISABLE_DMABUF_RENDERER=1
    if std::env::var("CONTINUA_GPU_FORCE_COMPOSITING").is_ok() {
        std::env::set_var("WEBKIT_FORCE_COMPOSITING_MODE", "1");
    }
    if let Ok(val) = std::env::var("CONTINUA_GPU_A_B") {
        if val == "1" {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }
    continua_desktop_lib::run()
}