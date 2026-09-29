/**
 * Continua content preload — runs in every content view (isolated world).
 * Two independent sections:
 *
 * 1. Link fork: "click a link → new tab". Capture plain left-clicks on
 *    http(s) anchors and route them through `window.open(url, "_blank")`,
 *    which lands in the host's setWindowOpenHandler → openTab. Covers SPA
 *    pushState links, which never fire will-navigate.
 *
 * 2. Login capture: on form submit, report {origin, username, password} to
 *    the host for a save-password prompt. Never prevents default (the login
 *    must proceed); the host prompts after the dust settles and only stores
 *    on explicit user consent. Secrets travel main-side only — the chrome UI
 *    never sees plain-text passwords.
 */
(function () {
  "use strict";

  // ---------- 1. link fork ----------
  function closestAnchor(node) {
    while (node && node !== document.documentElement) {
      if (node.tagName === "A" && node.href) return node;
      // Shadow DOM host traversal
      if (node.parentElement) node = node.parentElement;
      else if (node.parentNode) node = node.parentNode;
      else break;
    }
    return null;
  }

  function isHttp(url) {
    return /^https?:\/\//i.test(url || "");
  }

  function isHashOnly(anchor, href) {
    try {
      const cur = new URL(window.location.href);
      const next = new URL(href, window.location.href);
      return (
        cur.origin === next.origin &&
        cur.pathname === next.pathname &&
        cur.search === next.search &&
        next.hash &&
        next.hash !== cur.hash
      );
    } catch {
      return false;
    }
  }

  document.addEventListener(
    "click",
    (e) => {
      try {
        // Plain primary-button, no-modifier clicks only. Modified /
        // middle-clicks already have new-tab semantics in the host.
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const anchor = closestAnchor(e.target);
        if (!anchor) return;
        const href = anchor.href || anchor.getAttribute("href") || "";
        if (!isHttp(href)) return;
        if (anchor.hasAttribute("download")) return;
        if (isHashOnly(anchor, href)) return; // same-page anchor jump stays
        // Capture phase: run before page routers so a SPA pushState link
        // becomes a real new tab instead of an in-tab replace. stopPropagation
        // keeps the source tab on its page (no double navigation).
        // Trade-off: anchors that use href + JS side-effects will open a tab
        // instead of running the side-effect — that is the requested
        // "every link opens a new tab" behaviour.
        e.preventDefault();
        e.stopPropagation();
        window.open(href, "_blank", "noopener");
      } catch {
        /* never break page clicks */
      }
    },
    true,
  );

  // ---------- 2. login capture ----------
  let ipc = null;
  try {
    ipc = require("electron").ipcRenderer; // available in sandboxed preloads
  } catch {
    ipc = null;
  }

  function visible(el) {
    try {
      return !!(el && el.offsetParent !== null);
    } catch {
      return false;
    }
  }

  function fieldText(el, max) {
    try {
      return String(el && el.value ? el.value : "").trim().slice(0, max || 320);
    } catch {
      return "";
    }
  }

  // Map one input to an address-book key via autocomplete tokens, then
  // name/id/type heuristics. Coarse on purpose: name/email/tel + postal.
  function addressKey(input) {
    try {
      const ac = ((input.getAttribute && input.getAttribute("autocomplete")) || "").toLowerCase().trim().split(/\s+/).pop() || "";
      const known = {
        name: "name", "given-name": "name", "family-name": "name", nickname: "name",
        organization: "org", email: "email", tel: "tel", "tel-national": "tel",
        "street-address": "street", "address-line1": "street", "address-line2": "street",
        "address-level2": "city", "address-level1": "region", "address-level3": "region",
        country: "country", "country-name": "country", "postal-code": "zip",
      };
      if (ac && known[ac]) return known[ac];
      if (/^(cc-|.*card.*|.*cvv.*|.*cvc.*)/.test(ac)) return null; // never touch card fields
      const hay = ((input.name || "") + " " + (input.id || "") + " " + (input.type || "")).toLowerCase();
      if (/card|cvv|cvc|expir|cvc|pan\b/.test(hay)) return null;
      if (/e-?mail/.test(hay)) return "email";
      if (/tel|phone|mobile|fax/.test(hay)) return "tel";
      if (/company|organi[sz]ation|employer/.test(hay)) return "org";
      if (/street|address|addr|house|flat|apartment|suite/.test(hay)) return "street";
      if (/city|town|suburb|municipality/.test(hay)) return "city";
      if (/zip|postal|postcode|pin\b|pincode/.test(hay)) return "zip";
      if (/state|province|region|county/.test(hay)) return "region";
      if (/country/.test(hay)) return "country";
      if (/(first|last|full|given|sur|family|user|contact|your)?-?name/.test(hay)) return "name";
      return null;
    } catch {
      return null;
    }
  }

  document.addEventListener(
    "submit",
    (e) => {
      try {
        if (!ipc) return;
        const form = e.target;
        if (!form || form.tagName !== "FORM") return;
        // Web origins only — never capture on interstitials or internals.
        const proto = window.location.protocol || "";
        if (proto !== "http:" && proto !== "https:") return;
        const inputs = [...form.querySelectorAll("input,select,textarea")];
        const passEl =
          inputs.find((i) => (i.type || "").toLowerCase() === "password" && visible(i)) ||
          inputs.find((i) => (i.type || "").toLowerCase() === "password");
        if (passEl && passEl.value) {
          // Password login — same flow as before.
          const userEl =
            inputs.find(
              (i) =>
                i !== passEl &&
                /user|name|email|login|account/i.test(
                  (i.name || "") + (i.id || "") + (i.type || "") + (i.getAttribute("autocomplete") || ""),
                ),
            ) ||
            inputs.find(
              (i) =>
                i !== passEl &&
                ((i.type || "").toLowerCase() === "text" || (i.type || "").toLowerCase() === "email"),
            );
          const username = (userEl && userEl.value ? userEl.value : "").trim().slice(0, 320);
          const password = String(passEl.value || "").slice(0, 1024);
          if (!username || !password) return;
          ipc.send("continua-login-candidate", {
            origin: window.location.origin,
            username,
            password,
          });
          return;
        }
        // Address form (no password): needs 2+ contact fields with values.
        const fields = {};
        for (const input of inputs) {
          try {
            const tag = (input.tagName || "").toUpperCase();
            if (tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") continue;
            const it = (input.type || "").toLowerCase();
            if (it === "password" || it === "hidden" || it === "submit" || it === "button" || it === "checkbox" || it === "radio" || it === "file") continue;
            const key = addressKey(input);
            if (!key || fields[key]) continue;
            const v = fieldText(input, 100);
            if (v) fields[key] = v;
          } catch {}
        }
        if (Object.keys(fields).length < 2) return;
        ipc.send("continua-autofill-candidate", { origin: window.location.origin, fields });
      } catch {
        /* never break form submits */
      }
    },
    true,
  );
})();
