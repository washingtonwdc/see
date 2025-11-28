import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple master password unlock window (60s) for edit operations
  let masterUnlockUntil = 0;
  const unlockAttempts = new Map<string, { count: number; resetAt: number }>();
  const serverStartedAt = new Date().toISOString();
  const resolveVersion = () => {
    try {
      const tryPaths = [
        path.resolve(import.meta.dirname, "../package.json"),
        path.resolve(import.meta.dirname, "../../package.json"),
      ];
      for (const p of tryPaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, "utf-8");
          const pkg = JSON.parse(raw);
          if (pkg && typeof pkg.version === "string") return pkg.version as string;
        }
      }
    } catch {}
    return String(process.env.APP_VERSION || process.env.npm_package_version || "0.0.0");
  };
  const appVersion = resolveVersion();
  const releaseNotes = String(process.env.APP_RELEASE_NOTES || "");
  const resolveSlugParam = async (p: string) => {
    const num = Number(p);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      const s = await storage.getSetorById(num);
      return s ? s.slug : p;
    }
    return p;
  };
  const isMasterAllowed = (req: Request): boolean => {
    const now = Date.now();
    if (now < masterUnlockUntil) return true;
    const masterPwd = (process.env.MASTER_PASSWORD || "080808").trim();
    const candidate = String(
      (req.headers["x-master-password"] ||
        (req.body && (req.body as any).master_password) ||
        (req.query && (req.query.master_password as string)) ||
        "")
    ).trim();
    if (candidate === masterPwd) {
      const unlockMinutes = Math.max(1, Number(process.env.MASTER_UNLOCK_MINUTES || "5"));
      masterUnlockUntil = now + unlockMinutes * 60 * 1000;
      return true;
    }
    return false;
  };

  const sanitizeSetorPublic = (s: any) => {
    if (!s) return s;
    const clone = { ...s };
    delete clone.celular;
    delete clone.whatsapp;
    if (Array.isArray(clone.responsaveis)) {
      clone.responsaveis = [];
    }
    return clone;
  };

  // POST /api/admin/unlock - Validate master password and open unlock window
  app.post("/api/admin/unlock", async (req: Request, res: Response) => {
    try {
      const ip = String((req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")).split(",")[0];
      const now = Date.now();
      const rec = unlockAttempts.get(ip) || { count: 0, resetAt: now + 60 * 1000 };
      if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + 60 * 1000; }
      rec.count += 1; unlockAttempts.set(ip, rec);
      if (rec.count > 5) {
        return res.status(429).json({ error: "Muitas tentativas. Tente novamente em instantes." });
      }
      if (!isMasterAllowed(req)) {
        return res.status(403).json({ error: "Senha mestra inválida" });
      }
      const remaining = Math.max(0, masterUnlockUntil - Date.now());
      return res.json({ ok: true, unlock_ms: remaining });
    } catch (error) {
      console.error("Error unlocking admin:", error);
      res.status(500).json({ error: "Falha ao desbloquear admin" });
    }
  });
  // GET /api/setores - Get all setores or search with filters
  app.get("/api/setores", async (req, res) => {
    try {
      const { query, bloco, andar } = req.query;

      if (query || bloco || andar) {
        // Search with filters
        const results = await storage.searchSetores(
          query as string,
          bloco as string,
          andar as string
        );
        const allowed = isMasterAllowed(req);
        return res.json(allowed ? results : results.map(sanitizeSetorPublic));
      }

      // Get all setores
      const setores = await storage.getAllSetores();
      const allowed = isMasterAllowed(req);
      res.json(allowed ? setores : setores.map(sanitizeSetorPublic));
    } catch (error) {
      console.error("Error fetching setores:", error);
      res.status(500).json({ error: "Failed to fetch setores" });
    }
  });

  app.get("/api/version", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getStatistics();
      res.json({
        version: appVersion,
        env: app.get("env"),
        serverStartedAt,
        totalSetores: stats.totalSetores,
        releaseNotes,
      });
    } catch (error) {
      res.status(500).json({ error: "Falha ao obter versão" });
    }
  });

  // POST /api/setores - Create a new setor
  app.post("/api/setores", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      if (!isMasterAllowed(req)) {
        return res.status(403).json({ error: "Senha mestra inválida" });
      }
      const email = String(body.email || "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "E-mail inválido" });
      }
      const nome = String(body.nome || "").trim();
      const sigla = String(body.sigla || "").trim();
      if (!nome || !sigla) {
        return res.status(400).json({ error: "Informe nome e sigla" });
      }
      const setor = storage.createSetor({
        nome,
        sigla,
        bloco: body.bloco,
        andar: body.andar,
        email,
        observacoes: body.observacoes,
        ramal_principal: body.ramal_principal,
        ramais: Array.isArray(body.ramais) ? body.ramais : [],
      });
      return res.status(201).json(setor);
    } catch (error) {
      console.error("Error creating setor:", error);
      res.status(500).json({ error: "Falha ao criar setor" });
    }
  });

  // GET /api/blocos - unique list of blocos
  app.get("/api/blocos", async (_req, res) => {
    try {
      const setores = await storage.getAllSetores();
      const blocos = Array.from(new Set(setores.map(s => s.bloco).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      res.json(blocos);
    } catch (error) {
      console.error("Error fetching blocos:", error);
      res.status(500).json({ error: "Failed to fetch blocos" });
    }
  });

  // GET /api/andares - unique list of andares
  app.get("/api/andares", async (_req, res) => {
    try {
      const setores = await storage.getAllSetores();
      const andares = Array.from(new Set(setores.map(s => s.andar).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      res.json(andares);
    } catch (error) {
      console.error("Error fetching andares:", error);
      res.status(500).json({ error: "Failed to fetch andares" });
    }
  });

  // GET /api/setores/export - Export setores as JSON or CSV
  app.get("/api/setores/export", async (req: Request, res: Response) => {
    try {
      if (!isMasterAllowed(req)) {
        return res.status(403).json({ error: "Senha mestra inválida" });
      }
      const format = ((req.query.format as string) || "json").toLowerCase();
      const filename = `setores_${new Date().toISOString().replace(/[:.]/g, "-")}.${format === "csv" ? "csv" : "json"}`;
      if (format === "csv") {
        const csv = storage.toCSV();
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
        return res.send(csv);
      }
      const setores = await storage.getAllSetores();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
      return res.json(setores);
    } catch (error) {
      console.error("Error exporting setores:", error);
      res.status(500).json({ error: "Failed to export setores" });
    }
  });

  // GET /api/setores/:slug - Get setor by slug or id
  app.get("/api/setores/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const num = Number(slug);
      const setor = !Number.isNaN(num) && Number.isFinite(num)
        ? await storage.getSetorById(num)
        : await storage.getSetorBySlug(slug);

      if (!setor) {
        return res.status(404).json({ error: "Setor not found" });
      }

      const allowed = isMasterAllowed(req);
      res.json(allowed ? setor : sanitizeSetorPublic(setor));
    } catch (error) {
      console.error("Error fetching setor:", error);
      res.status(500).json({ error: "Failed to fetch setor" });
    }
  });

  // PATCH /api/setores/:slug/contatos - Atualiza contatos do setor
  app.patch("/api/setores/:slug/contatos", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const targetSlug = await resolveSlugParam(slug);
      const body = req.body || {};
      if (!isMasterAllowed(req)) {
        return res.status(403).json({ error: "Senha mestra inválida" });
      }
      const allowedKeys = new Set([
        "email",
        "ramal_principal",
        "ramais",
        "telefones",
        "telefones_externos",
        "celular",
        "whatsapp",
        "outros_contatos",
      ]);
      const payload: any = {};
      Object.keys(body || {}).forEach((k) => {
        if (allowedKeys.has(k)) payload[k] = (body as any)[k];
      });
      const updated = storage.updateSetorContacts(targetSlug, payload);
      if (!updated) {
        return res.status(404).json({ error: "Setor não encontrado" });
      }
      return res.json(updated);
    } catch (error) {
      console.error("Error updating contacts:", error);
      res.status(500).json({ error: "Falha ao atualizar contatos" });
    }
  });

  // PATCH /api/setores/:slug - Atualiza campos gerais (inclui bloco/andar e contatos)
  app.patch("/api/setores/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const targetSlug = await resolveSlugParam(slug);
      const body = req.body || {};
      // Any field edit requires master unlock
      if (!isMasterAllowed(req)) {
        return res.status(403).json({ error: "Senha mestra inválida" });
      }
      const allowedKeys = new Set([
        "bloco",
        "andar",
        "observacoes",
        "email",
        "ramal_principal",
        "ramais",
        "telefones",
        "telefones_externos",
        "celular",
        "whatsapp",
        "outros_contatos",
      ]);
      const payload: any = {};
      Object.keys(body || {}).forEach((k) => {
        if (allowedKeys.has(k)) payload[k] = (body as any)[k];
      });
      const updated = storage.updateSetorPartial(targetSlug, payload);
      if (!updated) {
        return res.status(404).json({ error: "Setor não encontrado" });
      }
      return res.json(updated);
    } catch (error) {
      console.error("Error updating setor:", error);
      res.status(500).json({ error: "Falha ao atualizar setor" });
    }
  });

  // POST /api/setores/:slug/ramais/access - Incrementa histórico de acesso a um ramal
  app.post("/api/setores/:slug/ramais/access", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const targetSlug = await resolveSlugParam(slug);
      // Qualquer alteração exige desbloqueio pela senha mestra
      if (!isMasterAllowed(req)) {
        return res.status(403).json({ error: "Senha mestra inválida" });
      }
      const { numero } = req.body || {};
      if (!numero) return res.status(400).json({ error: "Número do ramal é obrigatório" });
      const updated = storage.incrementRamalAccess(targetSlug, String(numero));
      if (!updated) return res.status(404).json({ error: "Setor não encontrado" });
      return res.json({ ok: true, acessos_ramais: updated.acessos_ramais || {} });
    } catch (error) {
      console.error("Error incrementing ramal access:", error);
      res.status(500).json({ error: "Falha ao registrar acesso ao ramal" });
    }
  });

  // POST /api/setores/:slug/ramais/favorite - Marca/desmarca um ramal como favorito
  app.post("/api/setores/:slug/ramais/favorite", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const targetSlug = await resolveSlugParam(slug);
      // Qualquer alteração exige desbloqueio pela senha mestra
      if (!isMasterAllowed(req)) {
        return res.status(403).json({ error: "Senha mestra inválida" });
      }
      const { numero, favorite } = req.body || {};
      if (!numero || typeof favorite === "undefined") {
        return res.status(400).json({ error: "Campos 'numero' e 'favorite' são obrigatórios" });
      }
      const updated = storage.setFavoriteRamal(targetSlug, String(numero), !!favorite);
      if (!updated) return res.status(404).json({ error: "Setor não encontrado" });
      return res.json({ ok: true, favoritos_ramais: updated.favoritos_ramais || [] });
    } catch (error) {
      console.error("Error toggling favorite ramal:", error);
      res.status(500).json({ error: "Falha ao marcar favorito" });
    }
  });

  // GET /api/setores/:slug/ramais/top - Retorna ramais mais acessados do setor
  app.get("/api/setores/:slug/ramais/top", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const limit = Math.max(1, Math.min(50, Number((req.query.limit as string) || 5)));
      const num = Number(slug);
      const setor = !Number.isNaN(num) && Number.isFinite(num)
        ? await storage.getSetorById(num)
        : await storage.getSetorBySlug(slug);
      if (!setor) return res.status(404).json({ error: "Setor não encontrado" });
      const map = setor.acessos_ramais || {};
      const list = Object.entries(map)
        .map(([numero, count]) => ({ numero, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      return res.json(list);
    } catch (error) {
      console.error("Error fetching top ramais:", error);
      res.status(500).json({ error: "Falha ao obter top ramais" });
    }
  });

  // GET /api/statistics - Get statistics
  app.get("/api/statistics", async (req, res) => {
    try {
      const stats = await storage.getStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // POST /api/setores/import - Import setores (JSON or RAW format)
  app.post("/api/setores/import", async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!isMasterAllowed(req)) {
        return res.status(403).json({ error: "Senha mestra inválida" });
      }
      const modeParam = (req.query.mode as string) || "replace";
      const mode = modeParam === "merge" ? "merge" : "replace";
      if (!body) {
        return res.status(400).json({ error: "Missing request body" });
      }
      if (Array.isArray(body)) {
        // Attempt to detect raw shape (with nested 'setor' key)
        if (body.length > 0 && typeof body[0] === "object" && body[0] && (body[0] as any).setor) {
          storage.importFromRaw(body as any[], mode);
        } else {
          storage.importFromNormalized(body as any[], mode);
        }
        const stats = await storage.getStatistics();
        return res.json({ ok: true, mode, count: (await storage.getAllSetores()).length, stats });
      }
      return res.status(400).json({ error: "Body must be an array of setores" });
    } catch (error) {
      console.error("Error importing setores:", error);
      res.status(500).json({ error: "Failed to import setores" });
    }
  });

  // POST /api/setores/import-csv - Import setores from CSV (expects raw text body)
  app.post("/api/setores/import-csv", async (req: Request, res: Response) => {
    try {
      if (!isMasterAllowed(req)) {
        return res.status(403).json({ error: "Senha mestra inválida" });
      }
      const modeParam = (req.query.mode as string) || "replace";
      const mode = modeParam === "merge" ? "merge" : "replace";
      const rawBuf = (req as any).rawBody as Buffer | Uint8Array | string | undefined;
      if (!rawBuf) {
        return res.status(400).json({ error: "Missing CSV body" });
      }
      const csvText = Buffer.isBuffer(rawBuf)
        ? rawBuf.toString("utf-8")
        : typeof rawBuf === "string"
          ? rawBuf
          : Buffer.from(rawBuf as Uint8Array).toString("utf-8");
      const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must include header and at least one row" });
      }
      const headers = lines[0].split(",").map(h => h.trim());
      const idx = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
      const setores = lines.slice(1).map(line => {
        // naive CSV split honoring quotes
        const values: string[] = [];
        let cur = ""; let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"') {
              if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
            } else { cur += ch; }
          } else {
            if (ch === ',') { values.push(cur); cur = ""; }
            else if (ch === '"') { inQuotes = true; }
            else { cur += ch; }
          }
        }
        values.push(cur);
        const get = (name: string) => {
          const ix = idx(name);
          return ix >= 0 ? values[ix] : "";
        };
        const parseList = (name: string) => get(name).split(/;\s*/).filter(Boolean);
        const idStr = get("id");
        const id = idStr ? Number(idStr) : Math.floor(Math.random() * 1e9);
        const setor = {
          id,
          sigla: get("sigla"),
          nome: get("nome"),
          slug: get("slug"),
          bloco: get("bloco"),
          andar: get("andar"),
          email: get("email"),
          ramal_principal: get("ramal_principal"),
          responsaveis: parseList("responsaveis").map(n => ({ nome: n })),
          ramais: parseList("ramais"),
          telefones: parseList("telefones"),
          telefones_externos: parseList("telefones_externos"),
          celular: get("celular"),
          whatsapp: get("whatsapp"),
          observacoes: get("observacoes"),
          ultima_atualizacao: get("ultima_atualizacao"),
        } as any;
        return setor;
      });
      storage.importFromNormalized(setores as any[], mode);
      const stats = await storage.getStatistics();
      return res.json({ ok: true, mode, count: (await storage.getAllSetores()).length, stats });
    } catch (error) {
      console.error("Error importing setores CSV:", error);
      res.status(500).json({ error: "Failed to import setores CSV" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
