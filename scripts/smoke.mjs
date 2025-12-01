const BASE = process.env.BASE_URL || process.argv[2] || "http://localhost:5001";
const MP = process.env.MASTER_PASSWORD || process.argv[3] || "";

async function call(method, path, opts = {}) {
  const url = BASE + path;
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  const body = opts.body ? JSON.stringify(opts.body) : undefined;
  const r = await fetch(url, { method, headers, body });
  const ct = String(r.headers.get("content-type") || "").toLowerCase();
  const txt = await r.text();
  let data = txt;
  if (ct.includes("application/json")) {
    try { data = JSON.parse(txt); } catch {}
  }
  return { status: r.status, data };
}

async function main() {
  const v = await call("GET", "/api/version");
  if (v.status !== 200) { console.error("version", v.status, v.data); process.exit(1); }

  const h = await call("GET", "/healthz");
  if (h.status !== 200) { console.error("healthz", h.status, h.data); process.exit(1); }

  const rdy = await call("GET", "/readyz");
  if (rdy.status !== 200 || !rdy.data || !rdy.data.ready) { console.error("readyz", rdy.status, rdy.data); process.exit(1); }

  const ps = await call("GET", "/api/persist/status");
  if (ps.status !== 200) { console.error("persist/status", ps.status, ps.data); process.exit(1); }

  const list = await call("GET", "/api/setores?paged=1&pageSize=1");
  if (list.status !== 200 || !list.data || !Array.isArray(list.data.items) || list.data.items.length === 0) {
    console.error("setores list", list.status, list.data); process.exit(1);
  }
  const slug = String(list.data.items[0].slug || list.data.items[0].id);

  if (!MP) { console.log("no master password provided; skipping edit test"); process.exit(0); }

  const unlock = await call("POST", "/api/admin/unlock", { headers: { "X-Master-Password": MP } });
  if (unlock.status !== 200 || !unlock.data || !unlock.data.ok) { console.error("unlock", unlock.status, unlock.data); process.exit(1); }

  const note = "smoke-" + Date.now();
  const patch = await call("PATCH", "/api/setores/" + encodeURIComponent(slug), { headers: { "X-Master-Password": MP }, body: { observacoes: note } });
  if (patch.status !== 200) { console.error("patch", patch.status, patch.data); process.exit(1); }

  const get = await call("GET", "/api/setores/" + encodeURIComponent(slug), { headers: { "X-Master-Password": MP } });
  if (get.status !== 200 || !get.data || get.data.observacoes !== note) { console.error("get", get.status, get.data); process.exit(1); }

  console.log(JSON.stringify({ ok: true, base: BASE, slug, note, persist: ps.data }, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error("smoke error", e && e.message || e); process.exit(1); });
