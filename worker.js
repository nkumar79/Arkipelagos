const ALLOWED_ORIGINS = [
    "https://www.arkipelagos.com",
    "https://arkipelagos.com",
    "http://localhost:8000",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
];

// Served until the first PUT. These are your current numbers.
const DEFAULTS = {
    irr: 32.1, moic: 5.8, nasdaq: 20.1, sp: 15.2, asof: "2026-08-07",
    holdings: [
        { name: "SpaceX", weight: 50.6 }, { name: "Microsoft", weight: 12.2 },
        { name: "Alphabet", weight: 11.5 }, { name: "Anthropic", weight: 10.0 },
        { name: "OpenAI", weight: 7.8 }, { name: "Tesla", weight: 5.4 },
        { name: "Zipline", weight: 2.5 },
    ],
};

async function isAdmin(req, env) {
    const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    return Boolean(env.ADMIN_TOKEN && auth && (await sameSecret(auth, env.ADMIN_TOKEN)));
}

const json = (data, status, extra) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
    });

async function sameSecret(a, b) {
    const enc = new TextEncoder();
    const [x, y] = await Promise.all([
        crypto.subtle.digest("SHA-256", enc.encode(a)),
        crypto.subtle.digest("SHA-256", enc.encode(b)),
    ]);
    return crypto.subtle.timingSafeEqual(x, y);
}

function validate(b) {
    const num = (v, max) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
    if (!b || typeof b !== "object") return "Body must be an object.";
    if (!num(b.irr, 1000) || !num(b.moic, 1000) || !num(b.nasdaq, 1000) || !num(b.sp, 1000)) return "Invalid performance numbers.";
    if (typeof b.asof !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.asof)) return "Invalid asof date.";
    if (!Array.isArray(b.holdings) || b.holdings.length !== DEFAULTS.holdings.length) return "Holdings must have " + DEFAULTS.holdings.length + " rows.";
    for (const h of b.holdings) {
        if (!h || typeof h.name !== "string" || h.name.length > 40 || !num(h.weight, 100)) return "Invalid holding row.";
    }
    return null;
}

export default {
    async fetch(req, env) {
        const url = new URL(req.url);
        const origin = req.headers.get("Origin") || "";
        const cors = ALLOWED_ORIGINS.includes(origin)
            ? {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400",
                "Vary": "Origin",
            }
            : { "Vary": "Origin" };

        if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
        if (url.pathname === "/api/verify" && req.method === "GET") {
            return (await isAdmin(req, env))
                ? json({ ok: true }, 200, cors)
                : json({ error: "Unauthorized" }, 401, cors);
        }
        if (url.pathname !== "/api/numbers") return json({ error: "Not found" }, 404, cors);

        if (req.method === "GET") {
            const stored = await env.ARK_KV.get("numbers", "json");
            return json(stored || DEFAULTS, 200, cors);
        }

        if (req.method === "PUT") {
            if (!(await isAdmin(req, env))) return json({ error: "Unauthorized" }, 401, cors);
            const text = await req.text();
            if (text.length > 4096) return json({ error: "Body too large" }, 413, cors);
            let body;
            try { body = JSON.parse(text); } catch { return json({ error: "Invalid JSON" }, 400, cors); }
            const err = validate(body);
            if (err) return json({ error: err }, 400, cors);

            const clean = {
                irr: body.irr, moic: body.moic, nasdaq: body.nasdaq, sp: body.sp, asof: body.asof,
                holdings: body.holdings.map((h) => ({ name: h.name, weight: h.weight })),
            };
            await env.ARK_KV.put("numbers", JSON.stringify(clean));
            return json(clean, 200, cors);
        }

        return json({ error: "Method not allowed" }, 405, cors);
    },
};