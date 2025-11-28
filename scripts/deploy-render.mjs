const serviceIdEnv = process.env.RENDER_SERVICE_ID || "";
const serviceName = process.env.RENDER_SERVICE_NAME || "lovable-data";
const apiKey = process.env.RENDER_API_KEY || "";

if (!apiKey) {
  console.error("Missing RENDER_API_KEY env var");
  process.exit(1);
}

async function resolveServiceId() {
  if (serviceIdEnv) return serviceIdEnv;
  const res = await fetch("https://api.render.com/v1/services", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Failed to list services: ${res.status}`);
  const list = await res.json();
  const match = Array.isArray(list) ? list.find((s) => s?.service?.name === serviceName || s?.name === serviceName) : null;
  if (!match) throw new Error(`Service not found by name: ${serviceName}`);
  return match.service?.id || match.id;
}

async function main() {
  const serviceId = await resolveServiceId();
  const url = `https://api.render.com/v1/services/${serviceId}/deploys`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("Render deploy failed", txt);
    process.exit(1);
  }
  const data = await res.json();
  console.log("Render deploy triggered", JSON.stringify(data));
}

main().catch((e) => {
  console.error("Deploy error", e?.message || String(e));
  process.exit(1);
});
import fs from "fs";

try {
  const envPath = process.cwd() + "/.env.deploy";
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf-8");
    raw.split(/\r?\n/).forEach((line) => {
      const s = line.trim();
      if (!s || s.startsWith("#")) return;
      const eq = s.indexOf("=");
      if (eq > 0) {
        const k = s.slice(0, eq).trim();
        const v = s.slice(eq + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    });
  }
} catch {}
