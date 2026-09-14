/* Omnibox quick answers: inline math, unit conversions and small lookups
 * that resolve without leaving the address bar. Pure JS — no network, so it
 * works even when the suggestions endpoint is offline. */

export interface QuickAnswer {
  text: string;
  sub: string;
}

const formatNum = (n: number): string => Math.round(n * 1e6) / 1e6;

/** Tiny recursive-descent evaluator for + - * / ( ) with decimals. */
function safeEval(expr: string): number | null {
  const tokens = expr.replace(/\s+/g, "").match(/\d+\.?\d*|[+*/()-]/g);
  if (!tokens) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const parseExpr = (): number => {
    let value = parseTerm();
    while (pos < tokens.length && (peek() === "+" || peek() === "-")) {
      const op = next()!;
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parseFactor();
    while (pos < tokens.length && (peek() === "*" || peek() === "/")) {
      const op = next()!;
      const rhs = parseFactor();
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  };
  const parseFactor = (): number => {
    if (peek() === "-") {
      next();
      return -parseFactor();
    }
    if (peek() === "+") {
      next();
      return parseFactor();
    }
    if (peek() === "(") {
      next();
      const v = parseExpr();
      if (peek() === ")") next();
      return v;
    }
    const t = next();
    if (t === undefined || isNaN(parseFloat(t))) throw new Error("bad token");
    return parseFloat(t);
  };
  try {
    const v = parseExpr();
    return pos === tokens.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Convert between compatible units; null when the pair isn't convertible. */
function convert(v: number, from: string, to: string): number | null {
  if (from === "c" && to === "f") return (v * 9) / 5 + 32;
  if (from === "f" && to === "c") return ((v - 32) * 5) / 9;
  // Canonical base: metres / kilograms.
  const LEN: Record<string, number> = {
    km: 1e3,
    m: 1,
    ft: 0.3048,
    cm: 0.01,
    mi: 1609.344,
    in: 0.0254,
  };
  const MAS: Record<string, number> = { kg: 1, lb: 0.45359237 };
  if (LEN[from] !== undefined && LEN[to] !== undefined) return (v * LEN[from]) / LEN[to];
  if (MAS[from] !== undefined && MAS[to] !== undefined) return (v * MAS[from]) / MAS[to];
  return null;
}

/** Resolve `input` to a quick answer, or null when it isn't one. */
export function quickAnswer(input: string): QuickAnswer | null {
  const q = input.trim();
  if (!q) return null;

  // Arithmetic (only when it actually contains an operator — a bare number
  // like "2024" is just a number, not a computation).
  if (/^[\d\s()+\-*/.]+$/.test(q) && /[+\-*/(]/.test(q)) {
    const value = safeEval(q);
    if (value !== null) {
      return {
        text: formatNum(value),
        sub: `= ${q}  (click to copy)`,
      };
    }
  }

  // Unit conversions: "12c in f", "5km to mi", "8kg -> lb".
  const conv = /^([\d.]+)\s*(c|f|km|mi|m|ft|cm|in|kg|lb)\s*(?:to|in|-|->|→)\s*(c|f|km|mi|m|ft|cm|in|kg|lb)$/i;
  let m = q.match(conv);
  if (m) {
    const v = parseFloat(m[1]);
    const from = m[2].toLowerCase();
    const to = m[3].toLowerCase();
    const r = convert(v, from, to);
    if (r !== null) {
      return {
        text: `${formatNum(r)} ${to}`,
        sub: `${q}  (click to copy)`,
      };
    }
  }

  // Minutes → h:mm ("90 min in hours").
  m = q.match(/^([\d.]+)\s*min(?:utes?)?\s*(?:in|to)\s+hours?$/i) ||
      q.match(/^([\d.]+)\s*m\s*(?:in|to)\s+h$/i);
  if (m) {
    const total = parseFloat(m[1]);
    const h = Math.floor(total / 60);
    const min = Math.round(total % 60);
    return {
      text: h > 0 ? `${h}h ${min}m` : `${min}m`,
      sub: `${q}  (click to copy)`,
    };
  }

  // Percentage: "40% of 250".
  m = q.match(/^([\d.]+)\s*%\s*of\s*([\d.]+)$/);
  if (m) {
    const pct = (parseFloat(m[1]) / 100) * parseFloat(m[2]);
    return {
      text: formatNum(pct),
      sub: `${q}  (click to copy)`,
    };
  }

  return null;
}