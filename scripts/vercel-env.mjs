const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT = process.env.VERCEL_PROJECT; // name or id
const TARGETS = ["production", "preview", "development"];

if (!TOKEN || !PROJECT) {
  console.error("Missing VERCEL_TOKEN or VERCEL_PROJECT env");
  process.exit(1);
}

const keys = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_BUCKET",
  "SUPABASE_PREFIX",
  "MASTER_PASSWORD",
];

async function resolveProjectId() {
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(PROJECT)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) {
    console.error("Failed to resolve project", r.status);
    process.exit(1);
  }
  const j = await r.json();
  return j.id || PROJECT;
}

async function addEnv(projectId, key, value) {
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env`;
  const body = { key, value, target: TARGETS, type: "encrypted" };
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    console.error(`Failed to set env '${key}'`, r.status, txt);
    process.exit(1);
  }
}

async function main() {
  const projectId = await resolveProjectId();
  for (const key of keys) {
    const val = process.env[key];
    if (!val) {
      console.log(`Skipping '${key}' (no value in env)`);
      continue;
    }
    // Do not log value; only the key.
    console.log(`Setting '${key}' for project ${projectId}`);
    await addEnv(projectId, key, val);
  }
  console.log("Done");
}

main().catch((e) => { console.error("vercel-env error", e && e.message || e); process.exit(1); });
