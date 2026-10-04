/**
 * Continua content preload — runs in every content view (isolated world).
 *
 * Login/address capture: on form submit, report candidates to the host for a
 * save prompt. Never prevents default (the login must proceed); the host
 * prompts after the dust settles and only stores on explicit user consent.
 * Secrets travel main-side only — the chrome UI never sees plain-text
 * passwords.
 *
 * NOTE (Chrome-like navigation): this file used to intercept every plain
 * left-click on http(s) anchors and re-route it through
 * `window.open(url, "_blank")`, so every clicked link forked a new tab and
 * nothing ever navigated in place. That made Back useless across clicked
 * links and sprayed tabs on multi-step flows (OAuth, checkouts) — nothing
 * like Chrome, where a plain click navigates the same tab. Removed: plain
 * clicks now proceed naturally (host will-navigate lets them through
 * in-tab), and SPA pushState/hash navigations are picked up by
 * did-navigate-in-page, which grows the same back/forward history stack.
 * Real new-tab gestures (Ctrl/Cmd+click, middle-click, target=_blank,
 * window.open) are routed by Chromium to the host's setWindowOpenHandler,
 * which still opens tabs.
 */
(function () {
  "use strict";
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
