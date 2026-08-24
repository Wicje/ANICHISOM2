mod commands;
mod daemon;

use commands::{get_system_info, list_directory_native, read_file_native, write_file_native};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

/// Single-instance guard: bind a fixed localhost port for the process
/// lifetime. A second launch fails to bind and exits quietly.
fn acquire_single_instance() -> Option<std::net::TcpListener> {
    std::net::TcpListener::bind("127.0.0.1:45619").ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Refuse a second daemon instance before touching the window/tray.
    let _instance_guard = match acquire_single_instance() {
        Some(listener) => Some(listener),
        None => {
            eprintln!("[continua] another Continua instance is already running.");
            return;
        }
    };

  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      get_system_info,
      read_file_native,
      write_file_native,
      list_directory_native
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // ─── System Tray (daemon control surface) ────────────────────────
      let status = MenuItem::with_id(app, "status", "Continua Daemon — starting…", false, None::<&str>)?;
      let pause_toggle = MenuItem::with_id(app, "pause", "Pause Monitoring", true, None::<&str>)?;
      let local_only = MenuItem::with_id(app, "local_only", "Local-Only Mode", true, None::<&str>)?;
      let dashboard = MenuItem::with_id(app, "dashboard", "Open Dashboard", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "Quit Continua", true, None::<&str>)?;

      let menu = Menu::with_items(app, &[&status, &pause_toggle, &local_only, &dashboard, &quit])?;

      let mut tray_builder = TrayIconBuilder::with_id("continua-daemon")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("Continua Daemon");

      // Use the bundled app icon (decoded at build time — no image crate needed)
      if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
      }

      let _tray = tray_builder.build(app)?;

      // Reflect persisted modes into the uplink flags.
      let cfg = daemon::config::load_config();
      if cfg.capability_token.is_empty() {
        daemon::set_status("No device token configured");
      }

      // Tray menu event handling
      app.on_menu_event(move |app, event| {
        match event.id().as_ref() {
          "pause" => {
            let now_paused = !daemon::uplink::is_paused();
            daemon::uplink::set_paused(now_paused);
            if now_paused {
              daemon::set_status("Paused");
            }
            log::info!("[tray] pause toggled -> {}", now_paused);
          }
          "local_only" => {
            let now_local = !daemon::uplink::is_local_only();
            daemon::uplink::set_local_only(now_local);
            log::info!("[tray] local-only toggled -> {}", now_local);
          }
          "dashboard" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "quit" => {
            app.exit(0);
          }
          _ => {}
        }
      });

      // ─── Background checkpoint loop ──────────────────────────────────
      daemon::spawn(app.handle().clone());

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
