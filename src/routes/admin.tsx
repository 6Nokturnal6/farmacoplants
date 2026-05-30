import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — FarmacoPlants" }] }),
  component: Admin,
});

type Tab = "plant" | "compound" | "activity" | "citation" | "link";

function Admin() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("compound");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) navigate({ to: "/login" });
    });
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  if (!userId) return null;
  if (isAdmin === null) return <div className="p-10 text-center text-muted-foreground">Checking access…</div>;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 grid place-items-center px-4">
          <div className="max-w-md text-center">
            <h1 className="font-display text-2xl font-semibold">Admin access required</h1>
            <p className="text-sm text-muted-foreground mt-2">Your account ({userId.slice(0, 8)}…) is signed in but does not have the <code className="text-foreground">admin</code> role.</p>
            <div className="mt-6 rounded-lg border border-border bg-card p-4 text-left text-sm">
              <div className="font-medium mb-2">Grant yourself admin (run once via the database):</div>
              <pre className="text-xs bg-secondary/40 p-3 rounded overflow-x-auto">{`INSERT INTO public.user_roles (user_id, role)
VALUES ('${userId}', 'admin')
ON CONFLICT DO NOTHING;`}</pre>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "compound", label: "Compound" },
    { key: "plant", label: "Plant" },
    { key: "activity", label: "Activity" },
    { key: "citation", label: "Citation" },
    { key: "link", label: "Link records" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-10">
        <h1 className="font-display text-4xl font-semibold">Curation</h1>
        <p className="text-muted-foreground mt-2">Add new records to the collection.</p>

        <div className="mt-6 flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " + (tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "compound" && <CompoundForm userId={userId} />}
          {tab === "plant" && <PlantForm userId={userId} />}
          {tab === "activity" && <ActivityForm userId={userId} />}
          {tab === "citation" && <CitationForm userId={userId} />}
          {tab === "link" && <LinkForm />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function useSubmitStatus() {
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  return { msg, setMsg };
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}{required && " *"}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
const inputCls = "w-full px-3 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function StatusBar({ msg }: { msg: { kind: "ok" | "err"; text: string } | null }) {
  if (!msg) return null;
  return <div className={"mt-3 text-sm px-3 py-2 rounded " + (msg.kind === "ok" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>{msg.text}</div>;
}

function csv(v: string) { return v.split(",").map((s) => s.trim()).filter(Boolean); }

function CompoundForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { msg, setMsg } = useSubmitStatus();
  const [f, setF] = useState({ name: "", iupac_name: "", smiles: "", inchi: "", inchi_key: "", molecular_formula: "", molecular_weight: "", compound_class: "", description: "" });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase.from("compounds").insert({
      name: f.name, iupac_name: f.iupac_name || null, smiles: f.smiles || null, inchi: f.inchi || null, inchi_key: f.inchi_key || null,
      molecular_formula: f.molecular_formula || null, molecular_weight: f.molecular_weight ? Number(f.molecular_weight) : null,
      compound_class: f.compound_class || null, description: f.description || null, created_by: userId,
    });
    if (error) setMsg({ kind: "err", text: error.message });
    else {
      setMsg({ kind: "ok", text: `Added "${f.name}".` });
      setF({ name: "", iupac_name: "", smiles: "", inchi: "", inchi_key: "", molecular_formula: "", molecular_weight: "", compound_class: "", description: "" });
      qc.invalidateQueries({ queryKey: ["compounds"] });
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" required><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} /></Field>
      <Field label="IUPAC name"><input value={f.iupac_name} onChange={(e) => setF({ ...f, iupac_name: e.target.value })} className={inputCls} /></Field>
      <Field label="SMILES"><input value={f.smiles} onChange={(e) => setF({ ...f, smiles: e.target.value })} className={inputCls + " font-mono"} placeholder="e.g. CC(=O)Oc1ccccc1C(=O)O" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="InChI Key"><input value={f.inchi_key} onChange={(e) => setF({ ...f, inchi_key: e.target.value })} className={inputCls + " font-mono"} /></Field>
        <Field label="Molecular formula"><input value={f.molecular_formula} onChange={(e) => setF({ ...f, molecular_formula: e.target.value })} className={inputCls + " font-mono"} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Molecular weight (g/mol)"><input type="number" step="0.001" value={f.molecular_weight} onChange={(e) => setF({ ...f, molecular_weight: e.target.value })} className={inputCls} /></Field>
        <Field label="Compound class"><input value={f.compound_class} onChange={(e) => setF({ ...f, compound_class: e.target.value })} className={inputCls} placeholder="alkaloid, flavonoid…" /></Field>
      </div>
      <Field label="InChI"><textarea rows={2} value={f.inchi} onChange={(e) => setF({ ...f, inchi: e.target.value })} className={inputCls + " font-mono"} /></Field>
      <Field label="Description"><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} /></Field>
      <button className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Add compound</button>
      <StatusBar msg={msg} />
    </form>
  );
}

function PlantForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { msg, setMsg } = useSubmitStatus();
  const [f, setF] = useState({ scientific_name: "", family: "", genus: "", common_names: "", local_names: "", geographic_origin: "", habitat: "", plant_parts: "", description: "", image_url: "" });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);
    const { error } = await supabase.from("plants").insert({
      scientific_name: f.scientific_name, family: f.family || null, genus: f.genus || null,
      common_names: f.common_names ? csv(f.common_names) : null,
      local_names: f.local_names ? csv(f.local_names) : null,
      geographic_origin: f.geographic_origin || null, habitat: f.habitat || null,
      plant_parts: f.plant_parts ? csv(f.plant_parts) : null,
      description: f.description || null, image_url: f.image_url || null, created_by: userId,
    });
    if (error) setMsg({ kind: "err", text: error.message });
    else { setMsg({ kind: "ok", text: `Added "${f.scientific_name}".` }); setF({ scientific_name: "", family: "", genus: "", common_names: "", local_names: "", geographic_origin: "", habitat: "", plant_parts: "", description: "", image_url: "" }); qc.invalidateQueries({ queryKey: ["plants"] }); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Scientific name" required><input required value={f.scientific_name} onChange={(e) => setF({ ...f, scientific_name: e.target.value })} className={inputCls + " italic"} placeholder="Catharanthus roseus" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Family"><input value={f.family} onChange={(e) => setF({ ...f, family: e.target.value })} className={inputCls} /></Field>
        <Field label="Genus"><input value={f.genus} onChange={(e) => setF({ ...f, genus: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="Common names (comma-separated)"><input value={f.common_names} onChange={(e) => setF({ ...f, common_names: e.target.value })} className={inputCls} /></Field>
      <Field label="Local names (comma-separated)"><input value={f.local_names} onChange={(e) => setF({ ...f, local_names: e.target.value })} className={inputCls} placeholder="Macua, Emakhuwa…" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Geographic origin"><input value={f.geographic_origin} onChange={(e) => setF({ ...f, geographic_origin: e.target.value })} className={inputCls} placeholder="Nampula, Mozambique" /></Field>
        <Field label="Plant parts (comma-separated)"><input value={f.plant_parts} onChange={(e) => setF({ ...f, plant_parts: e.target.value })} className={inputCls} placeholder="leaves, root, bark" /></Field>
      </div>
      <Field label="Habitat"><input value={f.habitat} onChange={(e) => setF({ ...f, habitat: e.target.value })} className={inputCls} /></Field>
      <Field label="Image URL"><input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} className={inputCls} /></Field>
      <Field label="Description"><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} /></Field>
      <button className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Add plant</button>
      <StatusBar msg={msg} />
    </form>
  );
}

function ActivityForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { msg, setMsg } = useSubmitStatus();
  const [f, setF] = useState({ name: "", category: "", description: "", mechanism: "" });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);
    const { error } = await supabase.from("pharmacological_activities").insert({ name: f.name, category: f.category || null, description: f.description || null, mechanism: f.mechanism || null, created_by: userId });
    if (error) setMsg({ kind: "err", text: error.message });
    else { setMsg({ kind: "ok", text: `Added "${f.name}".` }); setF({ name: "", category: "", description: "", mechanism: "" }); qc.invalidateQueries({ queryKey: ["activities"] }); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Activity name" required><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="Antimalarial" /></Field>
      <Field label="Category"><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inputCls} placeholder="Antiparasitic, Antioxidant…" /></Field>
      <Field label="Description"><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} /></Field>
      <Field label="Mechanism"><textarea rows={2} value={f.mechanism} onChange={(e) => setF({ ...f, mechanism: e.target.value })} className={inputCls} /></Field>
      <button className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Add activity</button>
      <StatusBar msg={msg} />
    </form>
  );
}

function CitationForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { msg, setMsg } = useSubmitStatus();
  const [f, setF] = useState({ title: "", authors: "", journal: "", year: "", doi: "", url: "" });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);
    const { error } = await supabase.from("citations").insert({ title: f.title, authors: f.authors || null, journal: f.journal || null, year: f.year ? Number(f.year) : null, doi: f.doi || null, url: f.url || null, created_by: userId });
    if (error) setMsg({ kind: "err", text: error.message });
    else { setMsg({ kind: "ok", text: "Citation added." }); setF({ title: "", authors: "", journal: "", year: "", doi: "", url: "" }); qc.invalidateQueries({ queryKey: ["citations"] }); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title" required><input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} /></Field>
      <Field label="Authors"><input value={f.authors} onChange={(e) => setF({ ...f, authors: e.target.value })} className={inputCls} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Journal"><input value={f.journal} onChange={(e) => setF({ ...f, journal: e.target.value })} className={inputCls} /></Field>
        <Field label="Year"><input type="number" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} className={inputCls} /></Field>
        <Field label="DOI"><input value={f.doi} onChange={(e) => setF({ ...f, doi: e.target.value })} className={inputCls + " font-mono"} /></Field>
      </div>
      <Field label="URL"><input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className={inputCls} /></Field>
      <button className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Add citation</button>
      <StatusBar msg={msg} />
    </form>
  );
}

function LinkForm() {
  const { msg, setMsg } = useSubmitStatus();
  const [kind, setKind] = useState<"plant_compound" | "compound_activity" | "plant_activity">("plant_compound");
  const plants = useQuery({ queryKey: ["all-plants"], queryFn: async () => (await supabase.from("plants").select("id,scientific_name").order("scientific_name").limit(500)).data ?? [] });
  const compounds = useQuery({ queryKey: ["all-compounds"], queryFn: async () => (await supabase.from("compounds").select("id,name").order("name").limit(500)).data ?? [] });
  const acts = useQuery({ queryKey: ["all-acts"], queryFn: async () => (await supabase.from("pharmacological_activities").select("id,name").order("name").limit(500)).data ?? [] });

  const [plantId, setPlantId] = useState("");
  const [compoundId, setCompoundId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [plantPart, setPlantPart] = useState("");
  const [extra, setExtra] = useState("");
  const [traditional, setTraditional] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);
    let error: any = null;
    if (kind === "plant_compound") {
      ({ error } = await supabase.from("plant_compounds").insert({ plant_id: plantId, compound_id: compoundId, plant_part: plantPart || null, concentration: extra || null }));
    } else if (kind === "compound_activity") {
      ({ error } = await supabase.from("compound_activities").insert({ compound_id: compoundId, activity_id: activityId, potency: extra || null }));
    } else {
      ({ error } = await supabase.from("plant_activities").insert({ plant_id: plantId, activity_id: activityId, plant_part: plantPart || null, traditional_use: traditional, notes: extra || null }));
    }
    if (error) setMsg({ kind: "err", text: error.message });
    else setMsg({ kind: "ok", text: "Link created." });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Link type">
        <select value={kind} onChange={(e) => setKind(e.target.value as any)} className={inputCls}>
          <option value="plant_compound">Plant ↔ Compound (constituent)</option>
          <option value="compound_activity">Compound ↔ Activity</option>
          <option value="plant_activity">Plant ↔ Activity</option>
        </select>
      </Field>

      {(kind === "plant_compound" || kind === "plant_activity") && (
        <Field label="Plant" required>
          <select required value={plantId} onChange={(e) => setPlantId(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {plants.data?.map((p) => <option key={p.id} value={p.id}>{p.scientific_name}</option>)}
          </select>
        </Field>
      )}
      {(kind === "plant_compound" || kind === "compound_activity") && (
        <Field label="Compound" required>
          <select required value={compoundId} onChange={(e) => setCompoundId(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {compounds.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {(kind === "compound_activity" || kind === "plant_activity") && (
        <Field label="Activity" required>
          <select required value={activityId} onChange={(e) => setActivityId(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {acts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}
      {kind !== "compound_activity" && (
        <Field label="Plant part"><input value={plantPart} onChange={(e) => setPlantPart(e.target.value)} className={inputCls} placeholder="leaves, root…" /></Field>
      )}
      <Field label={kind === "plant_compound" ? "Concentration" : kind === "compound_activity" ? "Potency (e.g. IC50)" : "Notes"}>
        <input value={extra} onChange={(e) => setExtra(e.target.value)} className={inputCls} />
      </Field>
      {kind === "plant_activity" && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={traditional} onChange={(e) => setTraditional(e.target.checked)} /> Traditional use</label>
      )}
      <button className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Create link</button>
      <StatusBar msg={msg} />
    </form>
  );
}
