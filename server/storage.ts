import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from "fs";
import { join } from "path";
import type { Setor, Statistics } from "@shared/schema";

export interface IStorage {
  // Get all setores
  getAllSetores(): Promise<Setor[]>;

  // Get setor by ID
  getSetorById(id: number): Promise<Setor | undefined>;

  // Get setor by slug
  getSetorBySlug(slug: string): Promise<Setor | undefined>;

  // Search setores with filters
  searchSetores(query?: string, bloco?: string, andar?: string): Promise<Setor[]>;

  // Get statistics
  getStatistics(): Promise<Statistics>;
}

export class MemStorage implements IStorage {
  private setores: Map<number, Setor>;
  private setoresBySlug: Map<string, Setor>;
  private overridesPath: string;
  private assetsDir: string;
  private backupsDir: string;

  constructor() {
    this.setores = new Map();
    this.setoresBySlug = new Map();
    this.assetsDir = String(process.env.ASSETS_DIR || join(process.cwd(), "attached_assets"));
    const assetsDir = this.assetsDir;
    try {
      if (!existsSync(assetsDir)) {
        mkdirSync(assetsDir, { recursive: true });
      }
    } catch {}
    this.backupsDir = join(assetsDir, "setores_overrides.backups");
    try {
      if (!existsSync(this.backupsDir)) {
        mkdirSync(this.backupsDir, { recursive: true });
      }
    } catch {}
    this.overridesPath = join(assetsDir, "setores_overrides.json");
    this.loadData();
  }

  private loadData() {
    try {
      // Resolve data file path
      let dataPath = String(process.env.DATA_FILE || "").trim();
      if (dataPath) {
        if (!dataPath.includes("/") && !dataPath.includes("\\")) {
          dataPath = join(this.assetsDir, dataPath);
        }
      } else {
        const files = readdirSync(this.assetsDir).filter(f => f.toLowerCase().endsWith(".json"));
        const candidates = files.filter(f => {
          const lower = f.toLowerCase();
          return lower.includes("dados") && lower.includes("normalizado");
        });
        const pick = (list: string[]) => {
          if (list.length === 0) return undefined;
          return list
            .map(f => ({ f, s: statSync(join(this.assetsDir, f)).mtimeMs }))
            .sort((a, b) => b.s - a.s)[0].f;
        };
        const chosen = pick(candidates) || pick(files);
        dataPath = chosen ? join(this.assetsDir, chosen) : join(this.assetsDir, "dados estruturados normalizado_1763396739562.json");
      }
      const rawData = readFileSync(dataPath, "utf-8");
      const jsonData = JSON.parse(rawData);

      // Transform and store data
      jsonData.forEach((item: any) => {
        // Normalize bloco: remove "BLOCO " prefix
        let blocoNormalized = item.setor.bloco || "";
        if (blocoNormalized.toUpperCase().startsWith("BLOCO ")) {
          blocoNormalized = blocoNormalized.substring(6).trim();
        }

        // Normalize andar: remove "º ANDAR" suffix and clean up
        let andarNormalized = item.setor.andar || "";
        if (andarNormalized.toUpperCase().includes(" ANDAR")) {
          andarNormalized = andarNormalized.replace(/\s*º?\s*ANDAR/i, "").trim();
        }

        const setor: Setor = {
          id: item.id,
          sigla: item.setor.sigla,
          nome: item.setor.nome,
          bloco: blocoNormalized,
          andar: andarNormalized,
          observacoes: item.setor.observacoes || "",
          email: item.setor.email,
          slug: item.setor.slug,
          ramal_principal: item.setor.ramal_principal || "",
          ramais: item.setor.ramais || [],
          telefones: item.setor.telefones || [],
          telefones_externos: item.setor.telefones_externos || [],
          responsaveis: item.responsaveis || [],
          celular: item.contatos.celular || "",
          whatsapp: item.contatos.whatsapp || "",
          outros_contatos: item.contatos.outros || [],
          ultima_atualizacao: item.ultima_atualizacao,
        };

        this.setores.set(setor.id, setor);
        this.setoresBySlug.set(setor.slug, setor);
      });

      console.log(`✅ Loaded ${this.setores.size} setores from JSON file`);
      // Apply persisted overrides if present
      this.loadOverrides();
    } catch (error) {
      console.error("❌ Error loading data:", error);
    }
  }

  private loadOverrides() {
    try {
      if (!existsSync(this.overridesPath)) return;
      const raw = readFileSync(this.overridesPath, "utf-8");
      const overrides = JSON.parse(raw);
      if (Array.isArray(overrides)) {
        overrides.forEach((ov) => {
          if (ov && typeof ov.slug === "string") {
            const existing = this.setoresBySlug.get(ov.slug);
            if (existing) {
              this.updateSetorPartial(ov.slug, ov);
            } else {
              // create setor from override when missing
              this.createSetor({
                slug: ov.slug,
                sigla: ov.sigla || ov.slug?.substring(0, 8) || "NOVO",
                nome: ov.nome || ov.slug || "Novo Setor",
                bloco: ov.bloco || "",
                andar: ov.andar || "",
                observacoes: ov.observacoes || "",
                email: ov.email || "",
                ramal_principal: ov.ramal_principal || "",
                ramais: ov.ramais || [],
                telefones: ov.telefones || [],
                telefones_externos: ov.telefones_externos || [],
                responsaveis: ov.responsaveis || [],
                celular: ov.celular || "",
                whatsapp: ov.whatsapp || "",
                outros_contatos: ov.outros_contatos || [],
                favoritos_ramais: ov.favoritos_ramais || [],
                acessos_ramais: ov.acessos_ramais || {},
              });
            }
          }
        });
        console.log(`🔧 Applied ${overrides.length} override(s)`);
      }
    } catch (err) {
      console.warn("⚠️ Failed to load overrides:", err);
    }
  }

  private normalize(text?: string): string {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  async getAllSetores(): Promise<Setor[]> {
    return Array.from(this.setores.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }

  async getSetorById(id: number): Promise<Setor | undefined> {
    return this.setores.get(id);
  }

  async getSetorBySlug(slug: string): Promise<Setor | undefined> {
    return this.setoresBySlug.get(slug);
  }

  async searchSetores(query?: string, bloco?: string, andar?: string): Promise<Setor[]> {
    let results = Array.from(this.setores.values());

    // Filter by query
    if (query) {
      const searchNormalized = this.normalize(query);

      // Check if query looks like "bloco X"
      let blocoSearch = "";
      if (searchNormalized.startsWith("bloco ")) {
        blocoSearch = searchNormalized.substring(6).trim();
      }

      results = results.filter(setor => {
        const matchGeneral =
          this.normalize(setor.nome).includes(searchNormalized) ||
          this.normalize(setor.sigla).includes(searchNormalized) ||
          this.normalize(setor.bloco).includes(searchNormalized) ||
          this.normalize(setor.andar).includes(searchNormalized) ||
          this.normalize(setor.email).includes(searchNormalized) ||
          setor.responsaveis.some(r => this.normalize(r.nome).includes(searchNormalized));

        if (blocoSearch) {
          return matchGeneral || this.normalize(setor.bloco) === blocoSearch;
        }
        return matchGeneral;
      });
    }

    // Filter by bloco (only if bloco is not empty string)
    if (bloco && bloco !== "all" && bloco.trim() !== "") {
      results = results.filter(setor => setor.bloco === bloco);
    }

    // Filter by andar (only if andar is not empty string)
    if (andar && andar !== "all" && andar.trim() !== "") {
      results = results.filter(setor => setor.andar === andar);
    }

    return results.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async getStatistics(): Promise<Statistics> {
    const setores = Array.from(this.setores.values());

    // Count unique blocos
    const blocosSet = new Set(setores.map(s => s.bloco).filter(Boolean));

    // Count unique andares
    const andaresSet = new Set(setores.map(s => s.andar).filter(Boolean));

    // Count total ramais
    const totalRamais = setores.reduce((acc, setor) => {
      return acc + (setor.ramais?.length || 0);
    }, 0);

    return {
      totalSetores: this.setores.size,
      totalBlocos: blocosSet.size,
      totalAndares: andaresSet.size,
      totalRamais,
    };
  }

  private transformRawItemToSetor(item: any): Setor {
    let blocoNormalized = item.setor?.bloco || "";
    if (typeof blocoNormalized === "string" && blocoNormalized.toUpperCase().startsWith("BLOCO ")) {
      blocoNormalized = blocoNormalized.substring(6).trim();
    }

    let andarNormalized = item.setor?.andar || "";
    if (typeof andarNormalized === "string" && andarNormalized.toUpperCase().includes(" ANDAR")) {
      andarNormalized = andarNormalized.replace(/\s*º?\s*ANDAR/i, "").trim();
    }

    const toPhones = (arr: any) => {
      const list = Array.isArray(arr) ? arr : [];
      return list.map((t: any) => {
        if (typeof t === "string") return { numero: t };
        const numero = String(t?.numero || "").trim();
        const link = t?.link ? String(t.link).trim() : "";
        const ro = t?.ramal_original ? String(t.ramal_original).trim() : "";
        return { numero, link, ramal_original: ro };
      }).filter((t: any) => t.numero);
    };
    return {
      id: item.id,
      sigla: item.setor?.sigla,
      nome: item.setor?.nome,
      bloco: blocoNormalized,
      andar: andarNormalized,
      observacoes: item.setor?.observacoes || "",
      email: item.setor?.email,
      slug: item.setor?.slug,
      ramal_principal: item.setor?.ramal_principal || "",
      ramais: item.setor?.ramais || [],
      telefones: toPhones(item.setor?.telefones),
      telefones_externos: toPhones(item.setor?.telefones_externos),
      responsaveis: item.responsaveis || [],
      celular: item.contatos?.celular || "",
      whatsapp: item.contatos?.whatsapp || "",
      outros_contatos: item.contatos?.outros || [],
      ultima_atualizacao: item.ultima_atualizacao,
    } as Setor;
  }

  private indexSetor(setor: Setor) {
    this.setores.set(setor.id, setor);
    this.setoresBySlug.set(setor.slug, setor);
  }

  replaceSetores(setores: Setor[]) {
    this.setores.clear();
    this.setoresBySlug.clear();
    setores.forEach((s) => this.indexSetor(s));
  }

  mergeSetores(setores: Setor[]) {
    setores.forEach((s) => {
      // prefer slug as stable identifier; fallback to id
      const existing = (s.slug && this.setoresBySlug.get(s.slug)) || this.setores.get(s.id);
      if (existing) {
        const merged: Setor = { ...existing, ...s };
        this.indexSetor(merged);
      } else {
        this.indexSetor(s);
      }
    });
  }

  importFromRaw(rawItems: any[], mode: "replace" | "merge" = "replace") {
    const setores = rawItems.map((it) => this.transformRawItemToSetor(it));
    if (mode === "replace") this.replaceSetores(setores);
    else this.mergeSetores(setores);
  }

  importFromNormalized(setores: Setor[], mode: "replace" | "merge" = "replace") {
    if (mode === "replace") this.replaceSetores(setores);
    else this.mergeSetores(setores);
  }

  createSetor(payload: Partial<Setor>) {
    const all = Array.from(this.setores.keys());
    const nextId = all.length > 0 ? Math.max(...all) + 1 : 1;
    const baseNome = String(payload.nome || payload.sigla || "Novo Setor").trim();
    const baseSigla = String(payload.sigla || (baseNome.split(" ")[0] || "NOVO")).trim();
    const makeSlug = (txt: string) => txt
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    let slug = String(payload.slug || makeSlug(baseNome)).trim();
    if (this.setoresBySlug.has(slug)) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const now = new Date().toISOString();
    const setor: Setor = {
      id: nextId,
      sigla: baseSigla || "NOVO",
      nome: baseNome || "Novo Setor",
      bloco: String(payload.bloco || "").trim(),
      andar: String(payload.andar || "").trim(),
      observacoes: String(payload.observacoes || "").trim(),
      email: String(payload.email || "").trim(),
      slug,
      ramal_principal: String(payload.ramal_principal || "").trim(),
      ramais: Array.isArray(payload.ramais) ? payload.ramais : [],
      telefones: Array.isArray(payload.telefones) ? payload.telefones : [],
      telefones_externos: Array.isArray(payload.telefones_externos) ? payload.telefones_externos : [],
      responsaveis: Array.isArray(payload.responsaveis) ? payload.responsaveis : [],
      celular: String(payload.celular || "").trim(),
      whatsapp: String(payload.whatsapp || "").trim(),
      outros_contatos: Array.isArray(payload.outros_contatos) ? payload.outros_contatos : [],
      favoritos_ramais: Array.isArray(payload.favoritos_ramais) ? payload.favoritos_ramais : [],
      acessos_ramais: payload.acessos_ramais || {},
      ultima_atualizacao: now,
    };
    this.indexSetor(setor);
    // persist to overrides
    try {
      let overrides: any[] = [];
      if (existsSync(this.overridesPath)) {
        const raw = readFileSync(this.overridesPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) overrides = parsed;
      }
      overrides.push({
        slug: setor.slug,
        sigla: setor.sigla,
        nome: setor.nome,
        bloco: setor.bloco,
        andar: setor.andar,
        observacoes: setor.observacoes,
        email: setor.email,
        ramal_principal: setor.ramal_principal,
        ramais: setor.ramais,
        telefones: setor.telefones,
        telefones_externos: setor.telefones_externos,
        responsaveis: setor.responsaveis,
        celular: setor.celular,
        whatsapp: setor.whatsapp,
        outros_contatos: setor.outros_contatos,
        favoritos_ramais: setor.favoritos_ramais,
        acessos_ramais: setor.acessos_ramais,
      });
      this.persistOverrides(overrides);
    } catch (err) {
      console.warn("⚠️ Failed to persist new setor:", err);
    }
    return setor;
  }

  toCSV(): string {
    const headers = [
      "id", "sigla", "nome", "slug", "bloco", "andar", "email", "ramal_principal", "responsaveis", "ramais", "telefones", "telefones_externos", "celular", "whatsapp", "observacoes", "ultima_atualizacao"
    ];
    const rows = Array.from(this.setores.values()).sort((a, b) => a.nome.localeCompare(b.nome)).map((s) => {
      const responsaveis = (s.responsaveis || []).map(r => r.nome).join("; ");
      const ramais = (s.ramais || []).join("; ");
      const telefones = (s.telefones || []).join("; ");
      const telefonesExternos = (s.telefones_externos || []).join("; ");
      const values = [
        s.id,
        s.sigla,
        s.nome,
        s.slug,
        s.bloco || "",
        s.andar || "",
        s.email || "",
        s.ramal_principal || "",
        responsaveis,
        ramais,
        telefones,
        telefonesExternos,
        s.celular || "",
        s.whatsapp || "",
        s.observacoes || "",
        s.ultima_atualizacao || "",
      ];
      return values.map(v => {
        const str = String(v ?? "");
        if (str.includes(";") || str.includes(",") || str.includes("\n") || str.includes('"')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Atualiza campos de contato de um setor pelo slug.
   */
  updateSetorContacts(
    slug: string,
    payload: Partial<{
      email: string;
      ramal_principal: string;
      ramais: string[];
      telefones: { numero: string; link?: string; ramal_original?: string }[];
      telefones_externos: { numero: string; link?: string; ramal_original?: string }[];
      celular: string;
      whatsapp: string;
      outros_contatos: string[];
    }>
  ) {
    const existing = this.setoresBySlug.get(slug);
    if (!existing) return undefined;

    const normalizePhones = (
      arr?: { numero: string; link?: string; ramal_original?: string }[]
    ) =>
      Array.isArray(arr)
        ? arr
          .filter((t) => t && String(t.numero || "").trim() !== "")
          .map((t) => ({
            numero: String(t.numero).trim(),
            link: t.link ? String(t.link).trim() : "",
            ramal_original: t.ramal_original ? String(t.ramal_original).trim() : "",
          }))
        : undefined;

    const updated = {
      ...existing,
      email: payload.email ?? existing.email,
      ramal_principal: payload.ramal_principal ?? existing.ramal_principal,
      ramais: Array.isArray(payload.ramais)
        ? payload.ramais.map((r) => String(r).trim()).filter((r) => r !== "")
        : existing.ramais,
      telefones: normalizePhones(payload.telefones) ?? existing.telefones,
      telefones_externos:
        normalizePhones(payload.telefones_externos) ?? existing.telefones_externos,
      celular: payload.celular ?? existing.celular,
      whatsapp: payload.whatsapp ?? existing.whatsapp,
      outros_contatos: Array.isArray(payload.outros_contatos)
        ? payload.outros_contatos
          .map((c) => String(c).trim())
          .filter((c) => c !== "")
        : existing.outros_contatos,
      ultima_atualizacao: new Date().toISOString(),
    };

    this.setores.set(updated.id, updated);
    this.setoresBySlug.set(updated.slug, updated);
    // persist overrides file
    try {
      let overrides: any[] = [];
      if (existsSync(this.overridesPath)) {
        const raw = readFileSync(this.overridesPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) overrides = parsed;
      }
      const idx = overrides.findIndex((o) => o && o.slug === slug);
      const toStore = {
        slug,
        email: updated.email,
        ramal_principal: updated.ramal_principal,
        ramais: updated.ramais,
        telefones: updated.telefones,
        telefones_externos: updated.telefones_externos,
        celular: updated.celular,
        whatsapp: updated.whatsapp,
        outros_contatos: updated.outros_contatos,
      };
      if (idx >= 0) overrides[idx] = toStore; else overrides.push(toStore);
      this.persistOverrides(overrides);
    } catch (err) {
      console.warn("⚠️ Failed to persist overrides:", err);
    }
    return updated;
  }

  /**
   * Atualiza campos gerais (inclui bloco/andar e contatos) de um setor pelo slug.
   */
  updateSetorPartial(
    slug: string,
    payload: Partial<{
      nome: string;
      bloco: string;
      andar: string;
      observacoes: string;
      email: string;
      ramal_principal: string;
      ramais: string[];
      telefones: { numero: string; link?: string; ramal_original?: string }[];
      telefones_externos: { numero: string; link?: string; ramal_original?: string }[];
      celular: string;
      whatsapp: string;
      outros_contatos: string[];
      favoritos_ramais: string[];
      acessos_ramais: Record<string, number>;
    }>
  ) {
    const existing = this.setoresBySlug.get(slug);
    if (!existing) return undefined;

    const normalizePhones = (
      arr?: { numero: string; link?: string; ramal_original?: string }[]
    ) =>
      Array.isArray(arr)
        ? arr
          .filter((t) => t && String(t.numero || "").trim() !== "")
          .map((t) => ({
            numero: String(t.numero).trim(),
            link: t.link ? String(t.link).trim() : "",
            ramal_original: t.ramal_original ? String(t.ramal_original).trim() : "",
          }))
        : undefined;

    const updated = {
      ...existing,
      nome: payload.nome ?? existing.nome,
      bloco: payload.bloco ?? existing.bloco,
      andar: payload.andar ?? existing.andar,
      observacoes: payload.observacoes ?? existing.observacoes,
      email: payload.email ?? existing.email,
      ramal_principal: payload.ramal_principal ?? existing.ramal_principal,
      ramais: Array.isArray(payload.ramais)
        ? payload.ramais.map((r) => String(r).trim()).filter((r) => r !== "")
        : existing.ramais,
      telefones: normalizePhones(payload.telefones) ?? existing.telefones,
      telefones_externos:
        normalizePhones(payload.telefones_externos) ?? existing.telefones_externos,
      celular: payload.celular ?? existing.celular,
      whatsapp: payload.whatsapp ?? existing.whatsapp,
      outros_contatos: Array.isArray(payload.outros_contatos)
        ? payload.outros_contatos
          .map((c) => String(c).trim())
          .filter((c) => c !== "")
        : existing.outros_contatos,
      favoritos_ramais: Array.isArray(payload.favoritos_ramais)
        ? payload.favoritos_ramais.map((r) => String(r).trim()).filter(Boolean)
        : existing.favoritos_ramais,
      acessos_ramais: payload.acessos_ramais ?? existing.acessos_ramais,
      ultima_atualizacao: new Date().toISOString(),
    };

    this.setores.set(updated.id, updated);
    this.setoresBySlug.set(updated.slug, updated);
    // persist overrides file (including bloco/andar when present)
    try {
      let overrides: any[] = [];
      if (existsSync(this.overridesPath)) {
        const raw = readFileSync(this.overridesPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) overrides = parsed;
      }
      const idx = overrides.findIndex((o) => o && o.slug === slug);
      const toStore: any = {
        slug,
        nome: updated.nome,
        bloco: updated.bloco,
        andar: updated.andar,
        observacoes: updated.observacoes,
        email: updated.email,
        ramal_principal: updated.ramal_principal,
        ramais: updated.ramais,
        telefones: updated.telefones,
        telefones_externos: updated.telefones_externos,
        celular: updated.celular,
        whatsapp: updated.whatsapp,
        outros_contatos: updated.outros_contatos,
        favoritos_ramais: updated.favoritos_ramais,
        acessos_ramais: updated.acessos_ramais,
      };
      if (idx >= 0) overrides[idx] = { ...overrides[idx], ...toStore }; else overrides.push(toStore);
      this.persistOverrides(overrides);
    } catch (err) {
      console.warn("⚠️ Failed to persist overrides:", err);
    }
    return updated;
  }

  private persistOverrides(overrides: any[]) {
    try {
      const payload = JSON.stringify(overrides, null, 2);
      writeFileSync(this.overridesPath, payload, "utf-8");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = join(this.backupsDir, `setores_overrides-${ts}.json`);
      writeFileSync(backupName, payload, "utf-8");
      try {
        const maxCount = Math.max(1, Number(process.env.SETORES_BACKUPS_MAX || "20"));
        const retentionDays = Math.max(0, Number(process.env.SETORES_BACKUPS_RETENTION_DAYS || "0"));
        const files = readdirSync(this.backupsDir)
          .filter((f) => f.endsWith(".json"))
          .map((f) => ({ f, m: statSync(join(this.backupsDir, f)).mtimeMs }))
          .sort((a, b) => b.m - a.m);
        if (retentionDays > 0) {
          const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
          files.filter((x) => x.m < cutoff).forEach((x) => {
            try { rmSync(join(this.backupsDir, x.f), { force: true }); } catch {}
          });
        }
        const refreshed = readdirSync(this.backupsDir)
          .filter((f) => f.endsWith(".json"))
          .map((f) => ({ f, m: statSync(join(this.backupsDir, f)).mtimeMs }))
          .sort((a, b) => b.m - a.m);
        if (refreshed.length > maxCount) {
          refreshed.slice(maxCount).forEach((x) => {
            try { rmSync(join(this.backupsDir, x.f), { force: true }); } catch {}
          });
        }
      } catch {}
    } catch (e) {
      console.warn("⚠️ Failed to write overrides/backup:", e);
    }
  }

  persistAllToOverrides() {
    try {
      const overrides = Array.from(this.setores.values()).map((s) => ({
        slug: s.slug,
        sigla: s.sigla,
        nome: s.nome,
        bloco: s.bloco,
        andar: s.andar,
        observacoes: s.observacoes,
        email: s.email,
        ramal_principal: s.ramal_principal,
        ramais: s.ramais,
        telefones: s.telefones,
        telefones_externos: s.telefones_externos,
        celular: s.celular,
        whatsapp: s.whatsapp,
        outros_contatos: s.outros_contatos,
        favoritos_ramais: s.favoritos_ramais,
        acessos_ramais: s.acessos_ramais,
      }));
      this.persistOverrides(overrides);
    } catch (e) {
      console.warn("⚠️ Failed to persist all overrides:", e);
    }
  }

  incrementRamalAccess(slug: string, numero: string) {
    const s = this.setoresBySlug.get(slug);
    if (!s) return undefined;
    const key = String(numero).trim();
    const map = { ...(s.acessos_ramais || {}) };
    map[key] = (map[key] || 0) + 1;
    return this.updateSetorPartial(slug, { acessos_ramais: map });
  }

  setFavoriteRamal(slug: string, numero: string, favorite: boolean) {
    const s = this.setoresBySlug.get(slug);
    if (!s) return undefined;
    const key = String(numero).trim();
    let favs = Array.isArray(s.favoritos_ramais) ? [...s.favoritos_ramais] : [];
    const has = favs.includes(key);
    if (favorite && !has) favs.push(key);
    if (!favorite && has) favs = favs.filter((r) => r !== key);
    return this.updateSetorPartial(slug, { favoritos_ramais: favs });
  }
}

export const storage = new MemStorage();
