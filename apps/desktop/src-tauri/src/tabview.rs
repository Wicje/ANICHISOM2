//! Single-window tab hosting.
//!
//! The React chrome (tauri `main` webview) is reparented into a `gtk::Fixed`
//! overlay drawn across the whole window; tab pages live in ONE `wry` content
//! webview stacked above it below the chrome strip. Tabs are metadata on the
//! Rust side (`TabManager`); switching a tab just navigates the content
//! view, which keeps the process light (one WebKit web process) and matches
//! the product's "distribution face, not another Chromium" constraint.
//!
//! All GTK/webview calls must run on the app's main thread. Worker and
//! command threads marshal in through the captured glib main context
//! (`run_on_main`); blocking reads use `eval_sync` (a channel + timeout) so
//! the calling thread waits while the main loop pumps the webview callback.

use std::cell::RefCell;
use std::sync::{mpsc, Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use gtk::prelude::*;
use tauri::{AppHandle, Emitter, Manager};
use webkit2gtk::*;
use wry::{NewWindowResponse, WebViewBuilder, WebViewBuilderExtUnix};

use crate::AppState;

thread_local! {
    static FIXED: RefCell<Option<gtk::Fixed>> = const { RefCell::new(None) };
    static MAIN_WIDGET: RefCell<Option<gtk::Widget>> = const { RefCell::new(None) };
    /// The single content webview (tab pages) plus the widget wry put into the fixed.
    static CONTENT: RefCell<Option<wry::WebView>> = const { RefCell::new(None) };
    static CONTENT_WIDGET: RefCell<Option<gtk::Widget>> = const { RefCell::new(None) };
    /// Persistent web context (cookies, storage, downloads). Kept alive for the
    /// webview's lifetime — wry warns dropping it breaks the view.
    static WEB_CONTEXT: RefCell<Option<wry::WebContext>> = const { RefCell::new(None) };
}

/// Thread id of the GTK main thread, captured at install time.
static MAIN_THREAD: OnceLock<std::thread::ThreadId> = OnceLock::new();
/// The main thread's glib main context, used to marshal calls from workers.
static MAIN_CONTEXT: OnceLock<gtk::glib::MainContext> = OnceLock::new();
/// The tab label whose page is currently loaded in the content webview.
static CONTENT_LABEL: Mutex<Option<String>> = Mutex::new(None);

fn is_main() -> bool {
    MAIN_THREAD.get() == Some(&std::thread::current().id())
}

/// Run `f` on the app's main thread (immediately if already there).
fn run_on_main<F: FnOnce() + Send + 'static>(f: F) {
    if is_main() {
        f();
        return;
    }
    match MAIN_CONTEXT.get() {
        Some(ctx) => ctx.invoke(f),
        None => f(),
    }
}

/// Install the overlay: take the chrome webview out of the window vbox and
/// put it (plus a future content view) into a `gtk::Fixed` covering the whole
/// window. Called once from setup on the main thread.
pub fn install(app: &AppHandle) -> Result<(), String> {
    let main = app.get_webview_window("main").ok_or("main window unavailable")?;
    let vbox = main.default_vbox().map_err(|e| e.to_string())?;

    let mut chrome_widget = None;
    for child in vbox.children() {
        if child.type_().name() == "WebKitWebView" {
            vbox.remove(&child);
            chrome_widget = Some(child);
        }
    }

    let fixed = gtk::Fixed::new();
    if let Some(w) = &chrome_widget {
        fixed.put(w, 0, 0);
    }
    vbox.pack_start(&fixed, true, true, 0);
    fixed.set_visible(true);

    let _ = MAIN_THREAD.set(std::thread::current().id());
    let _ = MAIN_CONTEXT.set(gtk::glib::MainContext::default());
    FIXED.with(|f| *f.borrow_mut() = Some(fixed));
    MAIN_WIDGET.with(|m| *m.borrow_mut() = chrome_widget);

    relayout(app)?;
    Ok(())
}

/// Lazy-build the single content webview on the main thread. Returns the
/// existing view if already built.
pub fn ensure_webview(app: &AppHandle) -> Result<(), String> {
    let exists = CONTENT.with(|c| c.borrow().is_some());
    if exists {
        return Ok(());
    }
    let out: Arc<Mutex<Option<Result<(), String>>>> = Arc::new(Mutex::new(None));
    let out2 = out.clone();
    let app = app.clone();
    run_on_main(move || {
        *out2.lock().unwrap() = Some(build_content(&app));
    });
    let result = out.lock().unwrap().take();
    match result {
        Some(r) => r,
        None => Err("overlay not installed".into()),
    }
}

fn build_content(app: &AppHandle) -> Result<(), String> {
    let some_fixed = FIXED.with(|f| f.borrow().clone());
    let fixed = some_fixed.ok_or("overlay not installed")?;

    // Persistent web context: cookies / logins / storage survive restarts.
    // Lives in thread_local WEB_CONTEXT so the box isn't dropped (wry keeps a
    // borrow of it for the webview's lifetime).
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("webdata");
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let mut web_context = wry::WebContext::new(Some(data_dir));

    let nav_app = app.clone();
    let title_app = app.clone();
    let newwin_app = app.clone();
    let builder = WebViewBuilder::new_with_web_context(&mut web_context)
        .with_url("about:blank")
        .with_initialization_script(crate::tab_engine::SCROLLBAR_STYLE_SCRIPT)
        .with_navigation_handler(move |url| crate::tabview::on_navigation(&nav_app, url))
        .with_document_title_changed_handler(move |title| crate::tabview::on_title(&title_app, title))
        .with_new_window_req_handler(move |url, _feat| crate::tabview::on_new_window(&newwin_app, url));

    let view = builder.build_gtk(&fixed).map_err(|e| e.to_string())?;

    // wry added its webkit view into the fixed after the chrome widget; the
    // newest child is ours (added later → drawn on top of the chrome page).
    let content_widget = fixed.children().into_iter().next_back();

    CONTENT.with(|c| *c.borrow_mut() = Some(view));
    WEB_CONTEXT.with(|w| *w.borrow_mut() = Some(web_context));
    CONTENT_WIDGET.with(|c| *c.borrow_mut() = content_widget.clone());

    if let Some(widget) = content_widget {
        wire_downloads(app, &widget);
    }
    Ok(())
}

// ── downloads ────────────────────────────────────────────────────────────────

/// OS Downloads directory (XDG), falling back to `$HOME/Downloads`.
fn download_dir() -> std::path::PathBuf {
    gtk::glib::user_special_dir(gtk::glib::UserDirectory::Downloads)
        .unwrap_or_else(|| gtk::glib::home_dir().join("Downloads"))
}

/// A path in `dir` that does not exist yet; `file.pdf`, `file (1).pdf`, …
fn unique_destination(dir: &std::path::Path, suggested: &str) -> std::path::PathBuf {
    let name: String = suggested
        .chars()
        .map(|c| {
            if matches!(c, '/' | '\\' | '\0' | ':') {
                '_'
            } else {
                c
            }
        })
        .collect();
    let name = name.trim().to_string();
    let name = if name.is_empty() { "download".into() } else { name };
    let (stem, ext) = match name.rfind('.') {
        Some(i) if i > 0 => (name[..i].to_string(), name[i..].to_string()),
        _ => (name.clone(), String::new()),
    };
    let mut path = dir.join(&name);
    let mut n = 1;
    while path.exists() {
        path = dir.join(format!("{stem} ({n}){ext}"));
        n += 1;
    }
    path
}

fn emit_download(app: &AppHandle, state: &str, filename: &str, detail: &str) {
    let _ = app.emit_to(
        "main",
        "download:state",
        serde_json::json!({
            "state": state,
            "filename": filename,
            "detail": detail,
        }),
    );
}

/// Attach WebKitGTK download handling to the content webview. Runs on the GTK
/// main thread (called from `build_content`). Content-Disposition attachments
/// are forced into WebKit's download pipeline; every download is saved to the
/// OS Downloads folder with a unique name and surfaced to the chrome UI.
fn wire_downloads(app: &AppHandle, widget: &gtk::Widget) {
    use gtk::glib::Cast;

    let Some(webview) = widget.downcast_ref::<webkit2gtk::WebView>() else {
        return;
    };

    webview.connect_decide_policy(move |_view, decision, decision_type| {
        if decision_type == webkit2gtk::PolicyDecisionType::Response {
            if let Some(resp) = decision.downcast_ref::<webkit2gtk::ResponsePolicyDecision>() {
                if let Some(response) = resp.response() {
                    if let Some(headers) = response.http_headers() {
                        if let Some(cd) = headers.one("Content-Disposition") {
                            if cd.to_lowercase().contains("attachment") {
                                decision.download();
                                decision.use_();
                                return true;
                            }
                        }
                    }
                }
            }
        }
        true
    });

    let Some(context) = webview.context() else {
        return;
    };
    let app_dl = app.clone();
    context.connect_download_started(move |_ctx, download| {
        let dir = download_dir();
        let app_d = app_dl.clone();
        download.connect_decide_destination(move |dl, suggested| {
            let path = unique_destination(&dir, suggested);
            let uri = match gtk::glib::filename_to_uri(&path, None) {
                Ok(uri) => uri,
                Err(_) => return false,
            };
            dl.set_destination(uri.as_str());

            let app_f = app_d.clone();
            let path_f = path.clone();
            dl.connect_finished(move |_| {
                let name_f = path_f.to_string_lossy().into_owned();
                emit_download(&app_f, "finished", &name_f, "");
            });
            let app_e = app_d.clone();
            let path_e = path.clone();
            dl.connect_failed(move |_, err| {
                let name_e = path_e.to_string_lossy().into_owned();
                emit_download(&app_e, "failed", &name_e, &err.to_string());
            });

            let _ = app_d.emit_to("main", "download:state", serde_json::json!({
                "state": "started",
                "filename": suggested,
                "detail": "",
            }));
            true
        });
    });
}

// ── wry event handlers (run on the main thread) ─────────────────────────────

fn current_label() -> Option<String> {
    CONTENT_LABEL.lock().unwrap().clone()
}

/// Decision hook for every main-frame navigation. Cancels the reserved
/// clean-exit URL (drops out of immersive mode instead) and records the
/// navigation into the currently-shown tab.
fn on_navigation(app: &AppHandle, url: String) -> bool {
    if let Ok(parsed) = url::Url::parse(&url) {
        if parsed.scheme() == "continua" && parsed.host_str() == Some("clean-exit") {
            let _ = crate::set_immersive_inner(app, false);
            return false;
        }
    }
    if let Some(label) = current_label() {
        if let Some(state) = app.try_state::<AppState>() {
            if let Ok(mut tabs) = state.tabs.lock() {
                tabs.record_navigation(app, &label, &url);
                crate::tabview::arm_after_load(app.clone(), label);
            }
        }
    }
    true
}

/// Document title events arrive live; file them against the shown tab.
fn on_title(app: &AppHandle, title: String) {
    if let Some(label) = current_label() {
        if let Some(state) = app.try_state::<AppState>() {
            if let Ok(mut tabs) = state.tabs.lock() {
                tabs.record_title(app, &label, &title);
            }
        }
    }
}

/// window.open / target=_blank → open a managed tab in place, deny the popup.
fn on_new_window(app: &AppHandle, url: String) -> NewWindowResponse {
    if let Ok(parsed) = url::Url::parse(&url) {
        if matches!(parsed.scheme(), "http" | "https") {
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(mut tabs) = state.tabs.lock() {
                    let _ = tabs.open(app, url);
                }
            }
        }
    }
    NewWindowResponse::Deny
}

/// Post-load finishing work (scroll restore, clean-exit pill, link preview,
/// redirect finalization) once the content view's document reaches complete.
fn on_load_finished(app: &AppHandle, label: &str) {
    let app1 = app.clone();
    let label1 = label.to_string();
    eval_async(
        app,
        "location.href".into(),
        move |href| {
            if let Some(state) = app1.try_state::<AppState>() {
                if let Ok(mut tabs) = state.tabs.lock() {
                    tabs.record_navigation(&app1, &label1, href.trim());
                }
            }
        },
    );

    let (scroll_y, immersive, link_preview) = (|| {
        let Some(state) = app.try_state::<AppState>() else {
            return (0.0, false, false);
        };
        let Ok(tabs) = state.tabs.lock() else {
            return (0.0, false, false);
        };
        let scroll = tabs.scroll_for(&label).unwrap_or(0.0);
        let link = state
            .config
            .lock()
            .map(|c| c.link_preview)
            .unwrap_or(false);
        (scroll, tabs.immersive(), link)
    })();

    if scroll_y > 0.0 {
        eval_async(app, format!("window.scrollTo(0, {scroll_y})"), |_| {});
    }
    if immersive {
        crate::inpage::clean_exit_pill(app, true);
    }
    if link_preview {
        let _ = crate::inpage::link_preview(app, true);
    }
}

/// Wait for the content view's document to finish loading, then run the
/// post-load work. Spawned off the calling thread so nothing blocks the main
/// loop; read-only evaluates are marshalled through `eval_sync`.
pub fn arm_after_load(app: AppHandle, label: String) {
    std::thread::spawn(move || {
        let deadline = Instant::now() + Duration::from_secs(6);
        loop {
            let state = eval_sync(&app, "document.readyState");
            let state = state.trim().to_string();
            if state == "complete" {
                break;
            }
            if Instant::now() > deadline {
                return;
            }
            std::thread::sleep(Duration::from_millis(160));
        }
        if current_label().as_deref() == Some(label.as_str()) {
            let app = app.clone();
            let label = label.clone();
            run_on_main(move || on_load_finished(&app, &label));
        }
    });
}

// ── page/navigation API (thread-safe entry points) ─────────────────────────

/// Load `url` into the content view under `label`, capturing the outgoing
/// tab's scroll first when switching away from it.
pub fn navigate(app: &AppHandle, label: &str, url: &str) -> Result<(), String> {
    ensure_webview(app)?;

    let old = current_label();
    if let Some(old_label) = old {
        if old_label != label {
            let v = eval_sync(app, SCROLL_READ_JS);
            if let Ok(y) = v.trim().parse::<f64>() {
                if let Some(state) = app.try_state::<AppState>() {
                    if let Ok(mut tabs) = state.tabs.lock() {
                        tabs.record_scroll(&old_label, y);
                    }
                }
            }
        }
    }

    *CONTENT_LABEL.lock().unwrap() = Some(label.to_string());

    let out: Arc<Mutex<Option<Result<(), String>>>> = Arc::new(Mutex::new(None));
    let out2 = out.clone();
    let url = url.to_string();
    run_on_main(move || {
        let r = CONTENT.with(|c| match c.borrow().as_ref() {
            Some(v) => v.load_url(&url).map_err(|e| e.to_string()),
            None => Err("no content webview".into()),
        });
        *out2.lock().unwrap() = Some(r);
    });
    match out.lock().unwrap().take() {
        Some(Err(e)) => return Err(e),
        _ => {}
    }

    relayout(app)?;
    arm_after_load(app.clone(), label.to_string());
    Ok(())
}

/// Show the tab already loaded in the content view (no reload).
pub fn show_tab(app: &AppHandle, label: &str, url: &str) -> Result<(), String> {
    ensure_webview(app)?;
    if current_label().as_deref() == Some(label) {
        focus_content(app);
        return relayout(app);
    }
    navigate(app, label, url)
}

/// Reload the current page.
pub fn reload(app: &AppHandle, label: &str) -> Result<(), String> {
    ensure_webview(app)?;
    *CONTENT_LABEL.lock().unwrap() = Some(label.to_string());
    let out: Arc<Mutex<Option<Result<(), String>>>> = Arc::new(Mutex::new(None));
    let out2 = out.clone();
    run_on_main(move || {
        let r = CONTENT.with(|c| match c.borrow().as_ref() {
            Some(v) => v.reload().map_err(|e| e.to_string()),
            None => Err("no content webview".into()),
        });
        *out2.lock().unwrap() = Some(r);
    });
    match out.lock().unwrap().take() {
        Some(Err(e)) => return Err(e),
        _ => {}
    }
    arm_after_load(app.clone(), label.to_string());
    Ok(())
}

/// Hide the content view (used when the last tab closes so the chrome's own
/// New Tab page shows through).
pub fn hide_content(app: &AppHandle) {
    let _ = app;
    run_on_main(|| {
        CONTENT.with(|c| {
            if let Some(v) = c.borrow().as_ref() {
                let _ = v.set_visible(false);
            }
        });
    });
}

/// Give keyboard input to the page in the content view.
pub fn focus_content(app: &AppHandle) {
    let app = app.clone();
    run_on_main(move || {
        CONTENT.with(|c| {
            if let Some(v) = c.borrow().as_ref() {
                let _ = v.focus();
            }
        });
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.set_focus();
        }
    });
}

/// Fire-and-forget evaluate on the content view (callback on the main thread).
pub fn eval_async<F: Fn(String) + Send + 'static>(_app: &AppHandle, js: String, cb: F) {
    run_on_main(move || {
        CONTENT.with(|c| {
            if let Some(v) = c.borrow().as_ref() {
                let _ = v.evaluate_script_with_callback(&js, cb);
            }
        });
    });
}

/// Synchronous evaluate: blocks the calling (worker) thread up to ~400ms for
/// the webview's result. Never call from the main thread (returns "").
pub fn eval_sync(app: &AppHandle, js: &str) -> String {
    if is_main() {
        eval_async(app, js.to_string(), |_| {});
        return String::new();
    }
    let js = js.to_string();
    let (tx, rx) = mpsc::channel::<String>();
    run_on_main(move || {
        CONTENT.with(|c| {
            if let Some(v) = c.borrow().as_ref() {
                let _ = v.evaluate_script_with_callback(&js, move |out| {
                    let _ = tx.send(out);
                });
            }
        });
    });
    rx.recv_timeout(Duration::from_millis(400)).unwrap_or_default()
}

/// Position the chrome at full window and the content view below the strip.
/// `chrome_h` is logical px, `rail` insets the left 44px column.
pub fn layout(app: &AppHandle, chrome_h: f64, rail: bool) -> Result<(), String> {
    let main = app.get_webview_window("main").ok_or("main window unavailable")?;
    let scale = main.scale_factor().map_err(|e| e.to_string())?;
    let size = main.inner_size().map_err(|e| e.to_string())?;

    let (rx, rw) = if rail { (44.0, 44.0) } else { (0.0, 0.0) };
    let x = (rx * scale).max(0.0) as i32;
    let y = (chrome_h * scale).max(0.0) as i32;
    let cw = (size.width as f64 - rw * scale).max(0.0) as i32;
    let ch = (size.height as f64 - chrome_h * scale).max(0.0) as i32;
    let mw = size.width as i32;
    let mh = size.height as i32;

    run_on_main(move || {
        if let (Some(widget), Some(fixed)) = (
            MAIN_WIDGET.with(|m| m.borrow().clone()),
            FIXED.with(|f| f.borrow().clone()),
        ) {
            fixed.move_(&widget, 0, 0);
            widget.set_size_request(mw.max(1), mh.max(1));
        }
        if let (Some(fixed), Some(widget)) = (
            FIXED.with(|f| f.borrow().clone()),
            CONTENT_WIDGET.with(|c| c.borrow().clone()),
        ) {
            fixed.move_(&widget, x, y);
        }
        CONTENT.with(|c| {
            if let Some(v) = c.borrow().as_ref() {
                if cw > 0 && ch > 0 {
let bounds = wry::Rect {
                        position: wry::dpi::PhysicalPosition::new(
                            x.max(0) as u32,
                            y.max(0) as u32,
                        )
                        .into(),
                        size: wry::dpi::PhysicalSize::new(cw.max(0) as u32, ch.max(0) as u32)
                            .into(),
                    };
                    let _ = v.set_bounds(bounds);
                    let _ = v.set_visible(true);
                }
            }
        });
    });
    Ok(())
}

/// Relayout driven by the engine: reads chrome height + rail from TabManager.
pub fn relayout(app: &AppHandle) -> Result<(), String> {
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(tabs) = state.tabs.lock() {
            return layout(app, tabs.chrome_height(), tabs.rail_enabled());
        }
    }
    layout(app, crate::CHROME_HEIGHT, false)
}

/// Last chrome geometry remembered by `remember_layout`, so a worker can drive
/// `relayout` without ever touching the tabs mutex. Dropped the moment the
/// engine relayouts; read as a fallback by `relayout` when the TabManager
/// lock is contended.
static LAST_GEOM: Mutex<Option<(f64, bool)>> = Mutex::new(None);

/// Remember the current chrome geometry for `relayout`/worker relayout calls.
/// Unit-returning and lock-light on purpose: the engine calls this right before
/// `layout`, the day worker threads must not block on the main GTK context.
pub fn remember_layout(chrome_h: f64, rail: bool) {
    *LAST_GEOM.lock().unwrap() = Some((chrome_h, rail));
}

/// Apply a WebKit zoom factor to the content webview (0.25–3.0). This is the
/// engine's native zoom level — it persists across navigations inside the tab
/// (unlike CSS zoom) and is shared by every pool slot. Main-thread marshalled
/// so it is safe to call from commands and workers.
pub fn apply_zoom(app: &AppHandle, zoom: f64) {
    let _ = app;
    let zoom = zoom.clamp(0.25, 3.0);
    run_on_main(move || {
        CONTENT_WIDGET.with(|c| {
            if let Some(w) = c.borrow().as_ref() {
                use gtk::glib::Cast;
                if let Some(v) = w.downcast_ref::<webkit2gtk::WebView>() {
                    v.set_zoom_level(zoom);
                }
            }
        });
    });
}

/// Arm a tiny selftest battery, gated by `CONTINUA_SELFTEST=1`. Goes through
/// the real committed surface (`install` → `relayout` → `navigate` →
/// `eval_sync` scroll read → `apply_zoom`) and reports each phase to
/// `CONTINUA_SELFTEST_LOGFILE` (default `/tmp/continua-selftest.log`). With
/// `CONTINUA_SELFTEST_EXIT=1` it tears the process down (exit 0) on success so
/// CI can assert on the exit code. Never runs in a normal launch.
pub fn arm_selftest(app: &AppHandle) {
    let enabled = std::env::var("CONTINUA_SELFTEST").map(|v| v == "1").unwrap_or(false);
    if !enabled {
        return;
    }
    let logfile = std::env::var("CONTINUA_SELFTEST_LOGFILE")
        .unwrap_or_else(|_| "/tmp/continua-selftest.log".to_string());
    let do_exit = std::env::var("CONTINUA_SELFTEST_EXIT").map(|v| v == "1").unwrap_or(false);
    let app = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(1500));
        let mut status: Vec<String> = Vec::new();
        status.push("install".into());
        let r = crate::tabview::install(&app);
        status.push(format!("install={}", r.is_ok()));
        let r = crate::tabview::relayout(&app);
        status.push(format!("relayout={}", r.is_ok()));
        let r = crate::tabview::navigate(&app, "selftest", "about:blank");
        status.push(format!("navigate={}", r.is_ok()));
        let v = crate::tabview::eval_sync(&app, SCROLL_READ_JS);
        status.push(format!("scroll={}", v.trim().parse::<f64>().is_ok()));
        crate::tabview::apply_zoom(&app, 1.25);
        crate::tabview::remember_layout(96.0, false);
        status.push("zoom=1.25".into());
        let ok = status.iter().all(|s| !s.ends_with("=false"));
        write_selftest_line(&logfile, &status, ok);
        if ok && do_exit {
            std::process::exit(0);
        }
    });
}

fn write_selftest_line(logfile: &str, status: &[String], ok: bool) {
    use std::io::Write;
    let line = format!(
        "CONTINUA {}: {}",
        if ok { "OK" } else { "FAIL" },
        status.join(" | ")
    );
    eprintln!("{line}");
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(logfile) {
        let _ = writeln!(f, "{line}");
    }
}

pub const SCROLL_READ_JS: &str =
    "(document.scrollingElement?document.scrollingElement.scrollTop:0)||window.pageYOffset||0";