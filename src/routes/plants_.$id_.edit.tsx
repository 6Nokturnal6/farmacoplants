import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCatalogRole } from "@/hooks/useCatalogRole";

export const Route = createFileRoute("/plants_/$id_/edit")({
  head: () => ({
    meta: [
      { title: "Edit plant — FarmacoPlants" },
      { name: "description", content: "Curator form for updating a medicinal plant record in the FarmacoPlants collection." },
      { property: "og:title", content: "Edit plant — FarmacoPlants" },
      { property: "og:description", content: "Curator form for updating a medicinal plant record." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditPlant,
});

const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

function EditPlant() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canWrite, loading: roleLoading, userId } = useCatalogRole();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: plant, isLoading } = useQuery({
    queryKey: ["plant", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("plants").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!plant) return;
    setForm({
      scientific_name: plant.scientific_name ?? "",
      family: plant.family ?? "",
      genus: plant.genus ?? "",
      common_names: (plant.common_names ?? []).join(", "),
      local_names: (plant.local_names ?? []).join(", "),
      plant_parts: (plant.plant_parts ?? []).join(", "),
      geographic_origin: plant.geographic_origin ?? "",
      habitat: plant.habitat ?? "",
      image_url: plant.image_url ?? "",
      description: plant.description ?? "",
    });
  }, [plant]);

  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("plants").update({
      scientific_name: form.scientific_name.trim(),
      family: form.family.trim() || null,
      genus: form.genus.trim() || null,
      common_names: list(form.common_names ?? ""),
      local_names: list(form.local_names ?? ""),
      plant_parts: list(form.plant_parts ?? ""),
      geographic_origin: form.geographic_origin.trim() || null,
      habitat: form.habitat.trim() || null,
      image_url: form.image_url.trim() || null,
      description: form.description.trim() || null,
    }).eq("id", id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["plant", id] });
    await qc.invalidateQueries({ queryKey: ["plants"] });
    navigate({ to: "/plants/$id", params: { id } });
  };

  const inputCls = "w-full px-3 py-2 rounded-md bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl px-6 py-10 w-full">
        <div className="text-xs text-muted-foreground">
          <Link to="/plants" className="hover:underline">Plants</Link> /{" "}
          <Link to="/plants/$id" params={{ id }} className="hover:underline">{plant?.scientific_name ?? "…"}</Link> / Edit
        </div>
        <h1 className="font-display text-3xl font-semibold mt-2">Edit plant</h1>

        {roleLoading || isLoading ? (
          <p className="text-muted-foreground mt-6">Loading…</p>
        ) : !userId ? (
          <p className="mt-6 text-sm text-muted-foreground">
            <Link to="/login" className="text-primary underline">Sign in</Link> as a curator to edit this record.
          </p>
        ) : !canWrite ? (
          <p className="mt-6 text-sm text-muted-foreground">Your account does not have curator access.</p>
        ) : (
          <form onSubmit={save} className="mt-6 space-y-4">
            <Field label="Scientific name"><input required value={form.scientific_name ?? ""} onChange={set("scientific_name")} className={inputCls + " italic"} /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Family"><input value={form.family ?? ""} onChange={set("family")} className={inputCls} /></Field>
              <Field label="Genus"><input value={form.genus ?? ""} onChange={set("genus")} className={inputCls} /></Field>
            </div>
            <Field label="Common names (comma separated)"><input value={form.common_names ?? ""} onChange={set("common_names")} className={inputCls} /></Field>
            <Field label="Local names (comma separated)"><input value={form.local_names ?? ""} onChange={set("local_names")} className={inputCls} /></Field>
            <Field label="Parts studied (comma separated)"><input value={form.plant_parts ?? ""} onChange={set("plant_parts")} className={inputCls} /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Geographic origin"><input value={form.geographic_origin ?? ""} onChange={set("geographic_origin")} className={inputCls} /></Field>
              <Field label="Habitat"><input value={form.habitat ?? ""} onChange={set("habitat")} className={inputCls} /></Field>
            </div>
            <Field label="Image URL or storage path"><input value={form.image_url ?? ""} onChange={set("image_url")} className={inputCls} /></Field>
            <Field label="Description"><textarea rows={6} value={form.description ?? ""} onChange={set("description")} className={inputCls} /></Field>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link to="/plants/$id" params={{ id }} className="px-4 py-2 rounded-md border border-border text-sm hover:border-primary/50">Cancel</Link>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
