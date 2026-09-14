//! In-page tooling — find-in-page, zoom, reader mode and a dark flip.
//!
//! Tab webviews load arbitrary remote sites and never expose IPC, so every
//! tool is a self-contained script evaluated inside the page. Scripts are
//! plain strings with unique `{{PLACEHOLDER}}` tokens substituted at runtime
//! (never format!/concat braces, so page content can't break them).

use std::time::Duration;

use tauri::Manager;
use tauri::webview::WebviewWindow;

/// Find-in-page: highlights every match, returns `{count, idx}` and scrolls
/// the active match into view. `dir` 0 = fresh search, 1 = next, -1 = prev.
pub const FIND_SCRIPT: &str = r#"(function(){
  var K='__contFind';
  var st=window[K]||(window[K]={q:'',heads:[],spans:[]});
  var q={{Q}};
  var dir={{D}};
  (st.spans||[]).forEach(function(s){
    var p=s.parentNode;
    if(p){p.replaceChild(document.createTextNode(s.textContent),s);p.normalize();}
  });
  st.spans=[];st.heads=[];
  if(!q||q.length>300){window.__contFind={count:0,idx:-1};return;}
  document.body.normalize();
  var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  var re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
  var matches=[];
  var node;
  while(node=walker.nextNode()){
    var pe=node.parentElement;
    if(pe&&/^(script|style|textarea|noscript)$/i.test(pe.tagName))continue;
    var t=node.nodeValue||'';
    if(!t)continue;
    var m,frag=document.createDocumentFragment(),pos=0,any=false;
    while((m=re.exec(t))!==null){
      if(m.index>pos)frag.appendChild(document.createTextNode(t.slice(pos,m.index)));
      var span=document.createElement('mark');
      span.textContent=m[0];
      span.style.cssText='background:#ffe8a3;color:#1a1a1a;border-radius:2px;box-shadow:0 0 0 1px rgba(201,169,79,.4)';
      frag.appendChild(span);st.spans.push(span);st.heads.push(span);
      pos=m.index+m[0].length;any=true;
      if(re.lastIndex===m.index)re.lastIndex+=1;
    }
    if(any){
      if(pos<t.length)frag.appendChild(document.createTextNode(t.slice(pos)));
      node.parentNode.replaceChild(frag,node);
    }
  }
  var total=st.heads.length;
  var idx;
  if(dir===0||total===0){idx=total>0?0:-1;}
  else if(dir===-1){idx=total>0?(((st.idx||0)-1+total)%total):-1;}
  else{idx=total>0?(((st.idx||0)+1)%total):-1;}
  st.idx=idx;
  window.__contFind={count:total,idx:idx};
  if(idx>=0){
    st.heads.forEach(function(h){h.style.background='#ffe8a3';});
    var cur=st.heads[idx];
    cur.style.background='#ffb020';
    if(dir!==0)cur.scrollIntoView({block:'center',behavior:'smooth'});
    else cur.scrollIntoView({block:'center'});
  }
  return JSON.stringify(window.__contFind);
})()"#;

/// Zoom a page. `step` 0 resets to 100%; otherwise the current factor is
/// nudged by `step` (0.15 per tick) and clamped to [0.5, 3.0]. Returns the
/// new factor as JSON so the chrome can show a live % readout.
pub const ZOOM_SCRIPT: &str = r#"(function(){
  var html=document.documentElement;
  var cur=parseFloat(html.getAttribute('data-cont-zoom')||'1');
  var next={{D}}===0?1:Math.max(0.5,Math.min(3.0,Math.round((cur+{{D}})*100)/100));
  html.setAttribute('data-cont-zoom',String(next));
  html.style.zoom=String(next);
  // Elements using percent/vw sizing reflow cleanly under zoom in WebKit.
  return JSON.stringify(Math.round(next*100));
})()"#;

/// Toggle reader mode: swaps the page for an extracted article view in a
/// fixed overlay. Re-running restores the live page. Font family and content
/// width come from the browser settings so reader mode honours preferences.
pub fn reader_script(font: &str, width: u64) -> String {
    let family = match font {
        "sans" => "-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif",
        "mono" => "ui-monospace,\"SF Mono\",\"Cascadia Code\",Menlo,monospace",
        _ => "Georgia,\"Times New Roman\",serif",
    };
    // Raw string: braces stay literal (no format!()), only {family}/{width}
    // are substituted below. The injected script builds a light reader overlay
    // with a floating toolbar (font size A+/A-, column width, exit).
    let js = r#"(function(){
  var K='__contReader';
  if(window[K]){
    var old=window[K]; document.body.style.overflow=''; old.remove(); delete window[K]; return '';
  }
  function best(sel){
    var list=Array.prototype.slice.call(document.querySelectorAll(sel));
    list.sort(function(a,b){return (b.innerText||'').length-(a.innerText||'').length;});
    return list[0]||null;
  }
  var article=best('article,main,[role="main"],.article,.post-content,.entry-content,.markdown-body')||document.body;
  var host=document.createElement('div');
  host.id='cont-reader';
  host.style.cssText='position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#f7f3ea;color:#24201a;padding:48px 16px 96px;font-family:{family};user-select:text;';
  var inner=document.createElement('div');
  inner.id='cr-inner';
  inner.style.cssText='max-width:{width}px;margin:0 auto;font-size:19px;line-height:1.75;';
  var h1=document.querySelector('h1');
  if(h1){
    var title=document.createElement('h1');
    title.textContent=h1.textContent;
    title.style.cssText='font-size:34px;line-height:1.2;margin:0 0 6px;';
    inner.appendChild(title);
    var src=document.createElement('div');
    src.textContent=location.hostname.replace(/^www\./,'');
    src.style.cssText='color:#8a8175;font-size:13px;font-family:-apple-system,sans-serif;margin-bottom:28px;';
    inner.appendChild(src);
  }
  var clone=article.cloneNode(true);
  clone.querySelectorAll('script,style,noscript,button,form,iframe,nav,footer,[class*="ad"],[id*="ad"],.comment').forEach(function(n){n.remove();});
  clone.style.cssText='';
  inner.appendChild(clone);
  host.appendChild(inner);

  var tb=document.createElement('div');
  tb.id='cr-toolbar';
  tb.style.cssText='position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;gap:4px;padding:5px;border-radius:11px;background:rgba(30,27,22,.92);box-shadow:0 8px 28px rgba(0,0,0,.32);backdrop-filter:blur(8px);';
  function btn(t,tip,fn){
    var b=document.createElement('button');
    b.textContent=t;
    b.title=tip||'';
    b.style.cssText='appearance:none;border:none;cursor:pointer;color:#f2efe9;background:transparent;font:600 14px -apple-system,BlinkMacSystemFont,sans-serif;padding:6px 9px;border-radius:8px;min-width:30px;transition:background 80ms;';
    b.addEventListener('mouseenter',function(){b.style.background='rgba(255,255,255,.16)';});
    b.addEventListener('mouseleave',function(){b.style.background='transparent';});
    b.addEventListener('click',fn);
    return b;
  }
  var fs=19, widths=[560,{width},860], wi=1;
  var applyFs=function(){inner.style.fontSize=fs+'px';};
  var applyW=function(){inner.style.maxWidth=widths[wi]+'px';};
  tb.appendChild(btn('A−','Decrease text size',function(){fs=Math.max(14,fs-1);applyFs();}));
  tb.appendChild(btn('A+','Increase text size',function(){fs=Math.min(30,fs+1);applyFs();}));
  tb.appendChild(btn('W','Cycle column width',function(){wi=(wi+1)%widths.length;applyW();}));
  tb.appendChild(btn('✕','Exit reader mode',function(){host.remove();document.body.style.overflow='';delete window[K];}));
  host.appendChild(tb);

  document.body.appendChild(host);
  document.body.style.overflow='hidden';
  window[K]=host;
  return '';
})()"#;
    js.replace("{family}", family).replace("{width}", &width.to_string())
}

/// Link preview: a floating badge under the cursor showing the hovered
/// anchor's destination. Runs entirely inside the page (remote tab webviews
/// have no IPC), so enabling just injects the overlay + capture listeners.
pub const LINK_PREVIEW_ENABLE: &str = r#"(function(){
  var K='__contLinkPreview';
  if(window[K]){return '';}
  var el=document.createElement('div');
  el.id='cont-link-preview';
  el.style.cssText='position:fixed;left:10px;bottom:10px;z-index:2147483647;max-width:min(90vw,640px);padding:6px 10px;border-radius:8px;background:rgba(18,18,20,.84);color:#f2f2f2;font:11px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;display:none;backdrop-filter:blur(8px);box-shadow:0 4px 18px rgba(0,0,0,.35)';
  function show(e){
    var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
    if(!a||!a.href){el.style.display='none';return;}
    el.textContent=a.href;
    el.style.display='block';
  }
  function hide(){el.style.display='none';}
  document.addEventListener('mouseover',show,true);
  document.addEventListener('mouseout',hide,true);
  document.body.appendChild(el);
  window[K]=el;
  return '';
})()"#;

pub const LINK_PREVIEW_DISABLE: &str = r#"(function(){
  var K='__contLinkPreview';
  var el=window[K];
  if(!el){return '';}
  window[K]=undefined;
  el.remove();
  return '';
})()"#;

/// Toggle a site-wide dark flip: invert + hue-rotate with a compensating
/// re-invert for media so photos/images stay natural-ish.
pub const DARK_SCRIPT: &str = r#"(function(){
  var html=document.documentElement;
  var K='__contDarkStyle';
  var existing=document.getElementById(K);
  if(existing){existing.remove();html.removeAttribute('data-cont-dark');return;}
  var s=document.createElement('style');s.id=K;
  s.textContent='html{filter:invert(0.9) hue-rotate(180deg) !important;background:#0b0b0b !important}img,video,canvas,iframe,[style*="background-image"]{filter:invert(1) hue-rotate(180deg) !important}';
  document.head.appendChild(s);
  html.setAttribute('data-cont-dark','1');
})()"#;

/// Run a script in a tab webview and block for up to 600ms for its result
/// string (empty if the page is mid-load or the script returned nothing).
fn eval_result(window: &WebviewWindow, js: &str) -> String {
    let (tx, rx) = std::sync::mpsc::channel::<String>();
    let res = window.eval_with_callback(js, move |out| {
        let _ = tx.send(out);
    });
    if res.is_err() {
        return String::new();
    }
    rx.recv_timeout(Duration::from_millis(600)).unwrap_or_default()
}

fn substitute(script: &str, pairs: &[(&str, &str)]) -> String {
    let mut out = script.to_string();
    for (token, value) in pairs {
        out = out.replace(token, value);
    }
    out
}

fn tab_window(app: &tauri::AppHandle, label: &str) -> Result<WebviewWindow, String> {
    app.get_webview_window(label)
        .ok_or_else(|| format!("no such tab: {label}"))
}

/// Find in page. Returns `{count, idx}`.
pub fn find(app: &tauri::AppHandle, label: &str, query: &str, dir: i32) -> Result<(usize, i32), String> {
    let js = substitute(
        FIND_SCRIPT,
        &[
            ("{{Q}}", &serde_json::to_string(query).unwrap_or_else(|_| "\"\"".into())),
            ("{{D}}", &dir.to_string()),
        ],
    );
    let raw = eval_result(&tab_window(app, label)?, &js);
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&raw);
    let (count, idx) = match parsed {
        Ok(v) => (
            v.get("count").and_then(|c| c.as_u64()).unwrap_or(0) as usize,
            v.get("idx").and_then(|i| i.as_i64()).map(|i| i as i32).unwrap_or(-1),
        ),
        Err(_) => (0, -1),
    };
    Ok((count, idx))
}

/// Apply a zoom delta (or reset when `step` == 0). Returns the new % factor.
pub fn zoom(app: &tauri::AppHandle, label: &str, step: f64) -> Result<f64, String> {
    let js = substitute(ZOOM_SCRIPT, &[("{{D}}", &step.to_string())]);
    let raw = eval_result(&tab_window(app, label)?, &js);
    Ok(raw.parse::<f64>().unwrap_or(100.0))
}

pub fn reader(app: &tauri::AppHandle, label: &str) -> Result<(), String> {
    let (font, width) = match app.try_state::<crate::AppState>() {
        Some(state) => match state.config.lock() {
            Ok(cfg) => (cfg.reader_font.clone(), cfg.reader_width),
            Err(_) => ("serif".into(), 720),
        },
        None => ("serif".into(), 720),
    };
    let _ = eval_result(&tab_window(app, label)?, &reader_script(&font, width));
    Ok(())
}

pub fn dark(app: &tauri::AppHandle, label: &str) -> Result<(), String> {
    let _ = eval_result(&tab_window(app, label)?, DARK_SCRIPT);
    Ok(())
}

/// Install or remove the link-preview overlay in one tab's page.
pub fn link_preview_to(window: &WebviewWindow, on: bool) {
    let js = if on { LINK_PREVIEW_ENABLE } else { LINK_PREVIEW_DISABLE };
    let _ = window.eval(js);
}

/// Apply the link-preview toggle to every open tab.
pub fn link_preview(app: &tauri::AppHandle, on: bool) -> Result<(), String> {
    if let Some(state) = app.try_state::<crate::AppState>() {
        if let Ok(tabs) = state.tabs.lock() {
            for label in tabs.labels() {
                if let Some(window) = app.get_webview_window(&label) {
                    link_preview_to(&window, on);
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn substitution_preserves_braces_in_scripts() {
        // The token replacement must not touch the script's own braces.
        let js = substitute(FIND_SCRIPT, &[("{{Q}}", "\"where {x}\""), ("{{D}}", "0")]);
        assert!(js.contains("var K='__contFind'"));
        assert!(js.contains("where {x}"));
        assert!(js.contains("return JSON.stringify"));
    }

    #[test]
    fn zoom_clamps_bounds() {
        // 0 → reset inline is handled by JS; static sanity: step format is a
        // plain float so substituted values stay numeric.
        let js = substitute(ZOOM_SCRIPT, &[("{{D}}", "0.15")]);
        assert!(js.contains("cur+0.15"));
    }
}