import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export type PlantProfile = {
  plant: any;
  compounds: any[];
  activities: any[];
  citations: any[];
};

export async function fetchPlantProfile(plantId: string): Promise<PlantProfile> {
  const [plantRes, compoundsRes, activitiesRes, citationsRes] = await Promise.all([
    supabase.from("plants").select("*").eq("id", plantId).maybeSingle(),
    supabase.from("plant_compounds").select("plant_part,concentration,notes,compounds(id,name,iupac_name,molecular_formula,compound_class,smiles)").eq("plant_id", plantId),
    supabase.from("plant_activities").select("plant_part,traditional_use,notes,pharmacological_activities(id,name,category,mechanism)").eq("plant_id", plantId),
    supabase.from("entity_citations").select("citations(id,title,authors,journal,year,doi,url)").eq("entity_kind", "plant").eq("entity_id", plantId),
  ]);
  if (plantRes.error || !plantRes.data) throw plantRes.error ?? new Error("Plant not found");
  return {
    plant: plantRes.data,
    compounds: compoundsRes.data ?? [],
    activities: activitiesRes.data ?? [],
    citations: (citationsRes.data ?? []).map((r: any) => r.citations).filter(Boolean),
  };
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "plant";
}

export function downloadPlantPdf(profile: PlantProfile) {
  const { plant, compounds, activities, citations } = profile;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin) { doc.addPage(); y = margin; }
  };
  const writeText = (text: string, opts: { size?: number; bold?: boolean; italic?: boolean; gap?: number } = {}) => {
    const { size = 11, bold = false, italic = false, gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : italic ? "italic" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const line of lines) {
      ensureSpace(size + 2);
      doc.text(line, margin, y);
      y += size + 2;
    }
    y += gap;
  };
  const heading = (t: string) => { ensureSpace(28); y += 6; writeText(t, { size: 14, bold: true, gap: 6 }); };

  writeText(plant.scientific_name, { size: 22, italic: true, gap: 2 });
  writeText([plant.family, plant.genus].filter(Boolean).join(" · "), { size: 11, gap: 10 });

  if (plant.common_names?.length) writeText(`Common names: ${plant.common_names.join(", ")}`);
  if (plant.local_names?.length) writeText(`Local names: ${plant.local_names.join(", ")}`);
  if (plant.geographic_origin) writeText(`Geographic origin: ${plant.geographic_origin}`);
  if (plant.habitat) writeText(`Habitat: ${plant.habitat}`);
  if (plant.plant_parts?.length) writeText(`Parts studied: ${plant.plant_parts.join(", ")}`);
  if (plant.description) { y += 4; writeText(plant.description); }

  heading(`Constituents (${compounds.length})`);
  if (!compounds.length) writeText("None recorded.", { italic: true });
  for (const c of compounds) {
    const comp = c.compounds;
    if (!comp) continue;
    writeText(`• ${comp.name}${comp.molecular_formula ? ` — ${comp.molecular_formula}` : ""}`, { bold: true, gap: 2 });
    const meta = [comp.compound_class, c.plant_part, c.concentration].filter(Boolean).join(" · ");
    if (meta) writeText(meta, { size: 10, gap: 2 });
    if (c.notes) writeText(c.notes, { size: 10 });
  }

  heading(`Reported activities (${activities.length})`);
  if (!activities.length) writeText("None recorded.", { italic: true });
  for (const a of activities) {
    const act = a.pharmacological_activities;
    if (!act) continue;
    writeText(`• ${act.name}${a.traditional_use ? " (traditional use)" : ""}`, { bold: true, gap: 2 });
    const meta = [act.category, a.plant_part].filter(Boolean).join(" · ");
    if (meta) writeText(meta, { size: 10, gap: 2 });
    if (act.mechanism) writeText(`Mechanism: ${act.mechanism}`, { size: 10 });
    if (a.notes) writeText(a.notes, { size: 10 });
  }

  heading(`References (${citations.length})`);
  if (!citations.length) writeText("None recorded.", { italic: true });
  citations.forEach((c, i) => {
    const parts = [`${i + 1}. ${c.authors || "Unknown"}`, c.year ? `(${c.year})` : null, c.title].filter(Boolean).join(" ");
    writeText(parts, { size: 10, gap: 2 });
    const tail = [c.journal, c.doi ? `doi:${c.doi}` : c.url].filter(Boolean).join(" · ");
    if (tail) writeText(tail, { size: 9 });
  });

  doc.save(`${slugify(plant.scientific_name)}-profile.pdf`);
}

function bibKey(c: any, fallbackIdx: number) {
  const first = (c.authors || "anon").split(/[,&]/)[0].trim().split(/\s+/).pop() || "anon";
  const year = c.year || "nd";
  const title = (c.title || "").split(/\s+/)[0] || `ref${fallbackIdx + 1}`;
  return slugify(`${first}${year}${title}`).replace(/-/g, "");
}
const esc = (v: string) => String(v).replace(/[{}]/g, "");

export function downloadPlantBibtex(profile: PlantProfile) {
  const { plant, citations } = profile;
  const entries = citations.map((c, i) => {
    const key = bibKey(c, i);
    const type = c.journal ? "article" : "misc";
    const fields: string[] = [];
    if (c.title) fields.push(`  title = {${esc(c.title)}}`);
    if (c.authors) fields.push(`  author = {${esc(c.authors)}}`);
    if (c.journal) fields.push(`  journal = {${esc(c.journal)}}`);
    if (c.year) fields.push(`  year = {${c.year}}`);
    if (c.doi) fields.push(`  doi = {${esc(c.doi)}}`);
    if (c.url) fields.push(`  url = {${esc(c.url)}}`);
    return `@${type}{${key},\n${fields.join(",\n")}\n}`;
  });
  const header = `% References for ${plant.scientific_name}\n% Exported from FarmacoPlants\n\n`;
  const blob = new Blob([header + entries.join("\n\n") + "\n"], { type: "application/x-bibtex" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(plant.scientific_name)}-refs.bib`;
  a.click();
  URL.revokeObjectURL(url);
}
