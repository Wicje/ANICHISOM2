//! In-page tooling — find-in-page, reader mode and a dark flip.
//! (Zoom moved to the native WebKit zoom level in `tabview::apply_zoom`.)
//!
//! Tab webviews load arbitrary remote sites and never expose IPC, so every
//! tool is a self-contained script evaluated inside the page. Scripts are
//! plain strings with unique `{{PLACEHOLDER}}` tokens substituted at runtime
//! (never format!/concat braces, so page content can't break them).

use tauri::Manager;

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

/// Run a script in the content webview and wait up to 600ms for its result
/// string. Must run on a worker thread (the GTK main thread is never
/// blocked by these tools).
fn eval_result(app: &tauri::AppHandle, js: &str) -> String {
    crate::tabview::eval_sync(app, js)
}

fn substitute(script: &str, pairs: &[(&str, &str)]) -> String {
    let mut out = script.to_string();
    for (token, value) in pairs {
        out = out.replace(token, value);
    }
    out
}

/// Find in page. Returns `{count, idx}`.
pub fn find(
    app: &tauri::AppHandle,
    _label: &str,
    query: &str,
    dir: i32,
) -> Result<(usize, i32), String> {
    let js = substitute(
        FIND_SCRIPT,
        &[
            ("{{Q}}", &serde_json::to_string(query).unwrap_or_else(|_| "\"\"".into())),
            ("{{D}}", &dir.to_string()),
        ],
    );
    let raw = eval_result(app, &js);
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

pub fn reader(app: &tauri::AppHandle, _label: &str) -> Result<(), String> {
    let (font, width) = match app.try_state::<crate::AppState>() {
        Some(state) => match state.config.lock() {
            Ok(cfg) => (cfg.reader_font.clone(), cfg.reader_width),
            Err(_) => ("serif".into(), 720),
        },
        None => ("serif".into(), 720),
    };
    let _ = eval_result(app, &reader_script(&font, width));
    Ok(())
}

pub fn dark(app: &tauri::AppHandle, _label: &str) -> Result<(), String> {
    let _ = eval_result(app, DARK_SCRIPT);
    Ok(())
}

/// Install or remove the link-preview overlay in the content view.
pub fn link_preview(app: &tauri::AppHandle, on: bool) -> Result<(), String> {
    let js = if on { LINK_PREVIEW_ENABLE } else { LINK_PREVIEW_DISABLE };
    crate::tabview::eval_async(app, js.into(), |_| {});
    Ok(())
}

/// Clean-mode exit pill: while immersive, hovering the top edge reveals a
/// small "Exit clean mode" pill. Clicking it navigates to the reserved
/// `continua://clean-exit/` URL, which `tab_engine`'s navigation handler
/// intercepts and cancels to drop out of immersive mode. Deliberately avoids
/// global Tauri IPC, so tab websites stay sandboxed from the app.
pub const CLEAN_EXIT_SCRIPT: &str = r#"(function(){
  if(window.__contCleanPill){
    window.__continua_clean__={{ARM}};
    (window.__contCleanSync||function(){})();
    return;
  }
  window.__contCleanPill=true;
  var pill=document.createElement('div');
  pill.id='continua-clean-exit';
  pill.textContent='Exit clean mode · Esc';
  pill.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483646;padding:7px 16px;border-radius:0 0 12px 12px;background:rgba(18,22,28,.86);color:#eef1f6;font:12px system-ui,-apple-system,sans-serif;line-height:1;letter-spacing:.3px;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.35);opacity:0;transition:opacity .16s ease;pointer-events:none;border:1px solid rgba(255,255,255,.09);border-top:none';
  (document.body||document.documentElement).appendChild(pill);
  var sync=function(){
    var near=window.__continua_clean__&&(window._contCleanY||0)<48;
    pill.style.opacity=near?'1':'0';
    pill.style.pointerEvents=near?'auto':'none';
  };
  window.__contCleanSync=sync;
  document.addEventListener('mousemove',function(e){window._contCleanY=e.clientY;sync();},{passive:true});
  document.addEventListener('mouseleave',function(){window._contCleanY=-1;sync();});
  window.addEventListener('scroll',sync,{passive:true});
  pill.addEventListener('click',function(){window.location.href='continua://clean-exit/';});
  window.__continua_clean__={{ARM}};
  sync();
})()"#;

pub fn clean_exit_pill(app: &tauri::AppHandle, armed: bool) {
    let js = substitute(
        CLEAN_EXIT_SCRIPT,
        &[("{{ARM}}", if armed { "true" } else { "false" })],
    );
    crate::tabview::eval_async(app, js, |_| {});
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
}