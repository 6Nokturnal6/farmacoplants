import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Pencil, Trash2, X } from "lucide-react";

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
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "compound", label: "Compounds" },
    { key: "plant", label: "Plants" },
    { key: "activity", label: "Activities" },
    { key: "citation", label: "Citation" },
    { key: "link", label: "Link records" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-10">
        <h1 className="font-display text-4xl font-semibold">Curation</h1>
        <p className="text-muted-foreground mt-2">Create, edit and delete records.</p>

        <div className="mt-6 flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " + (tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "compound" && <CompoundsTab userId={userId} />}
          {tab === "plant" && <PlantsTab userId={userId} />}
          {tab === "activity" && <ActivitiesTab userId={userId} />}
          {tab === "citation" && <CitationForm userId={userId} />}
          {tab === "link" && <LinkForm />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ---------- shared bits ----------

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

function RecordList<T extends { id: string }>({
  title, rows, isLoading, getLabel, getSub, onEdit, onDelete, editingId,
}: {
  title: string;
  rows: T[] | undefined;
  isLoading: boolean;
  getLabel: (r: T) => string;
  getSub?: (r: T) => string | null;
  onEdit: (r: T) => void;
  onDelete: (r: T) => void;
  editingId?: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{rows?.length ?? 0} records</span>
      </div>
      <div className="max-h-[480px] overflow-y-auto divide-y divide-border">
        {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && (rows?.length ?? 0) === 0 && <div className="p-4 text-sm text-muted-foreground">No records yet.</div>}
        {rows?.map((r) => (
          <div key={r.id} className={"px-4 py-2.5 flex items-center justify-between gap-3 " + (editingId === r.id ? "bg-primary/5" : "")}>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{getLabel(r)}</div>
              {getSub?.(r) && <div className="text-xs text-muted-foreground truncate">{getSub(r)}</div>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(r)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => onDelete(r)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function confirmDelete(label: string, fn: () => Promise<{ error: { message: string } | null }>, onDone: () => void, setMsg: (m: { kind: "ok" | "err"; text: string }) => void) {
  if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
  const { error } = await fn();
  if (error) setMsg({ kind: "err", text: error.message });
  else { setMsg({ kind: "ok", text: `Deleted "${label}".` }); onDone(); }
}

// ---------- RELATIONSHIP MANAGER ----------

// Controlled vocabulary for plant_part (lowercase, normalized).
const ALLOWED_PLANT_PARTS = [
  "leaf", "leaves", "root", "roots", "bark", "stem", "stems",
  "flower", "flowers", "fruit", "fruits", "seed", "seeds",
  "rhizome", "tuber", "bulb", "latex", "resin", "wood",
  "whole plant", "aerial parts", "twig", "twigs", "sap", "exudate", "pericarp",
];

// Permissive scientific-notation pattern for concentration & potency values.
const SCI_VALUE_RE = /^[A-Za-z0-9.,%/<>=±≤≥μµ\s()\-+×x*·]+$/;

/** Validate a relationship metadata field. Returns null if valid, else an error string. */
function validateRelationField(key: string, value: string | boolean): string | null {
  if (typeof value === "boolean") {
    return key === "traditional_use" ? null : `${key} must be a string`;
  }
  const v = value.trim();
  if (v === "") return null; // empty allowed → stored as null

  if (key === "plant_part") {
    if (v.length > 60) return "Plant part is too long (max 60 chars).";
    if (!ALLOWED_PLANT_PARTS.includes(v.toLowerCase())) {
      return `Invalid plant part "${v}". Allowed: ${ALLOWED_PLANT_PARTS.slice(0, 8).join(", ")}…`;
    }
    return null;
  }
  if (key === "concentration" || key === "potency") {
    if (v.length > 100) return `${key} is too long (max 100 chars).`;
    if (!SCI_VALUE_RE.test(v)) return `${key} has invalid characters. Use numbers, units (mg, %, μM), comparators (<, >, ±).`;
    return null;
  }
  if (key === "notes") {
    if (v.length > 500) return "Notes too long (max 500 chars).";
    return null;
  }
  if (v.length > 255) return `${key} is too long (max 255 chars).`;
  return null;
}

type RelField = { key: string; label: string; type?: "text" | "checkbox"; placeholder?: string };

type RelationManagerProps = {
  title: string;
  table: "plant_compounds" | "compound_activities" | "plant_activities";
  ownerColumn: string;
  ownerId: string;
  targetColumn: string;
  targetQueryKey: string;
  targetTable: "plants" | "compounds" | "pharmacological_activities";
  targetLabelColumn: string;
  extraFields?: RelField[];
};

function RelationManager({
  title, table, ownerColumn, ownerId, targetColumn,
  targetQueryKey, targetTable, targetLabelColumn, extraFields = [],
}: RelationManagerProps) {
  const qc = useQueryClient();
  const { msg, setMsg } = useSubmitStatus();

  const links = useQuery({
    queryKey: ["rel", table, ownerColumn, ownerId],
    queryFn: async () => {
      const { data } = await supabase.from(table).select("*").eq(ownerColumn, ownerId).limit(1000);
      return (data ?? []) as Array<Record<string, unknown> & { id: string }>;
    },
  });

  const targets = useQuery({
    queryKey: [targetQueryKey],
    queryFn: async () => {
      const { data } = await supabase.from(targetTable).select(`id, ${targetLabelColumn}`).order(targetLabelColumn).limit(1000);
      return ((data ?? []) as unknown) as Array<{ id: string } & Record<string, string>>;
    },
  });

  const targetMap = new Map((targets.data ?? []).map((t) => [t.id, t[targetLabelColumn]]));

  const [targetId, setTargetId] = useState("");
  const [extra, setExtra] = useState<Record<string, string | boolean>>(
    Object.fromEntries(extraFields.map((f) => [f.key, f.type === "checkbox" ? false : ""])),
  );

  const resetForm = () => {
    setTargetId("");
    setExtra(Object.fromEntries(extraFields.map((f) => [f.key, f.type === "checkbox" ? false : ""])));
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMsg(null);
    if (!targetId) { setMsg({ kind: "err", text: "Select a record to link." }); return; }
    const row: Record<string, unknown> = { [ownerColumn]: ownerId, [targetColumn]: targetId };
    for (const f of extraFields) {
      const v = extra[f.key];
      const err = validateRelationField(f.key, v);
      if (err) { setMsg({ kind: "err", text: err }); return; }
      if (f.type === "checkbox") row[f.key] = !!v;
      else {
        const s = typeof v === "string" ? v.trim() : "";
        row[f.key] = s ? s : null;
      }
    }
    const { error } = await supabase.from(table).insert(row as never);
    if (error) setMsg({ kind: "err", text: error.message });
    else {
      setMsg({ kind: "ok", text: "Link added." });
      resetForm();
      qc.invalidateQueries({ queryKey: ["rel", table, ownerColumn, ownerId] });
    }
  };

  const remove = async (rowId: string, label: string) => {
    if (!window.confirm(`Remove link to "${label}"?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", rowId);
    if (error) setMsg({ kind: "err", text: error.message });
    else {
      setMsg({ kind: "ok", text: "Link removed." });
      qc.invalidateQueries({ queryKey: ["rel", table, ownerColumn, ownerId] });
    }
  };

  const linkedIds = new Set((links.data ?? []).map((l) => l[targetColumn] as string));
  const available = (targets.data ?? []).filter((t) => !linkedIds.has(t.id));

  return (
    <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">{links.data?.length ?? 0}</span>
      </div>

      <div className="divide-y divide-border rounded-md border border-border/60 max-h-48 overflow-y-auto">
        {links.isLoading && <div className="p-3 text-xs text-muted-foreground">Loading…</div>}
        {!links.isLoading && (links.data?.length ?? 0) === 0 && (
          <div className="p-3 text-xs text-muted-foreground">No links yet.</div>
        )}
        {links.data?.map((l) => {
          const tid = l[targetColumn] as string;
          const name = targetMap.get(tid) ?? tid.slice(0, 8);
          const meta = extraFields
            .map((f) => {
              const v = l[f.key];
              if (v === null || v === undefined || v === "" || v === false) return null;
              return f.type === "checkbox" ? f.label : `${f.label}: ${String(v)}`;
            })
            .filter(Boolean)
            .join(" • ");
          return (
            <div key={l.id} className="px-3 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm truncate">{name}</div>
                {meta && <div className="text-xs text-muted-foreground truncate">{meta}</div>}
              </div>
              <button type="button" onClick={() => remove(l.id, String(name))} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 pt-1">
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputCls}>
          <option value="">+ Add link…</option>
          {available.map((t) => <option key={t.id} value={t.id}>{t[targetLabelColumn]}</option>)}
        </select>
        {targetId && extraFields.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {extraFields.map((f) =>
              f.type === "checkbox" ? (
                <label key={f.key} className="flex items-center gap-2 text-xs col-span-2">
                  <input type="checkbox" checked={!!extra[f.key]} onChange={(e) => setExtra({ ...extra, [f.key]: e.target.checked })} />
                  {f.label}
                </label>
              ) : (
                <input
                  key={f.key}
                  value={String(extra[f.key] ?? "")}
                  onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })}
                  placeholder={f.placeholder ?? f.label}
                  className={inputCls + " text-xs"}
                  list={f.key === "plant_part" ? "plant-parts-vocab" : undefined}
                  maxLength={f.key === "notes" ? 500 : f.key === "plant_part" ? 60 : 100}
                />
              ),
            )}
          </div>
        )}
        {targetId && (
          <button type="button" onClick={add} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
            Link
          </button>
        )}
        <StatusBar msg={msg} />
        <datalist id="plant-parts-vocab">
          {ALLOWED_PLANT_PARTS.map((p) => <option key={p} value={p} />)}
        </datalist>
      </div>
    </div>
  );
}

// ---------- COMPOUNDS ----------

type CompoundRow = { id: string; name: string; iupac_name: string | null; smiles: string | null; inchi: string | null; inchi_key: string | null; molecular_formula: string | null; molecular_weight: number | null; compound_class: string | null; description: string | null };
const EMPTY_COMPOUND = { name: "", iupac_name: "", smiles: "", inchi: "", inchi_key: "", molecular_formula: "", molecular_weight: "", compound_class: "", description: "" };

function CompoundsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { msg, setMsg } = useSubmitStatus();
  const [editing, setEditing] = useState<CompoundRow | null>(null);
  const [f, setF] = useState(EMPTY_COMPOUND);

  const list = useQuery({
    queryKey: ["admin-compounds"],
    queryFn: async () => (await supabase.from("compounds").select("*").order("name").limit(1000)).data as CompoundRow[] | null,
  });

  const reset = () => { setEditing(null); setF(EMPTY_COMPOUND); };
  const startEdit = (r: CompoundRow) => {
    setEditing(r);
    setF({
      name: r.name, iupac_name: r.iupac_name ?? "", smiles: r.smiles ?? "", inchi: r.inchi ?? "", inchi_key: r.inchi_key ?? "",
      molecular_formula: r.molecular_formula ?? "", molecular_weight: r.molecular_weight?.toString() ?? "",
      compound_class: r.compound_class ?? "", description: r.description ?? "",
    });
    setMsg(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);
    const payload = {
      name: f.name, iupac_name: f.iupac_name || null, smiles: f.smiles || null, inchi: f.inchi || null, inchi_key: f.inchi_key || null,
      molecular_formula: f.molecular_formula || null, molecular_weight: f.molecular_weight ? Number(f.molecular_weight) : null,
      compound_class: f.compound_class || null, description: f.description || null,
    };
    const { error } = editing
      ? await supabase.from("compounds").update(payload).eq("id", editing.id)
      : await supabase.from("compounds").insert({ ...payload, created_by: userId });
    if (error) setMsg({ kind: "err", text: error.message });
    else {
      setMsg({ kind: "ok", text: editing ? `Updated "${f.name}".` : `Added "${f.name}".` });
      reset();
      qc.invalidateQueries({ queryKey: ["admin-compounds"] });
      qc.invalidateQueries({ queryKey: ["compounds"] });
    }
  };

  const onDelete = (r: CompoundRow) => confirmDelete(
    r.name,
    async () => await supabase.from("compounds").delete().eq("id", r.id),
    () => { qc.invalidateQueries({ queryKey: ["admin-compounds"] }); qc.invalidateQueries({ queryKey: ["compounds"] }); if (editing?.id === r.id) reset(); },
    setMsg,
  );

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <FormHeader title={editing ? "Edit compound" : "New compound"} onCancel={editing ? reset : undefined} />
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
          <SubmitRow editing={!!editing} label="compound" />
          <StatusBar msg={msg} />
        </form>

        {editing && (
          <>
            <RelationManager
              title="Source plants"
              table="plant_compounds"
              ownerColumn="compound_id"
              ownerId={editing.id}
              targetColumn="plant_id"
              targetQueryKey="all-plants"
              targetTable="plants"
              targetLabelColumn="scientific_name"
              extraFields={[
                { key: "plant_part", label: "Part", placeholder: "leaves, root…" },
                { key: "concentration", label: "Concentration", placeholder: "0.2 % w/w" },
              ]}
            />
            <RelationManager
              title="Pharmacological activities"
              table="compound_activities"
              ownerColumn="compound_id"
              ownerId={editing.id}
              targetColumn="activity_id"
              targetQueryKey="all-acts"
              targetTable="pharmacological_activities"
              targetLabelColumn="name"
              extraFields={[
                { key: "potency", label: "Potency", placeholder: "IC50 / MIC" },
                { key: "assay", label: "Assay", placeholder: "in vitro…" },
              ]}
            />
          </>
        )}
      </div>
      <RecordList<CompoundRow>
        title="All compounds"
        rows={list.data ?? undefined}
        isLoading={list.isLoading}
        getLabel={(r) => r.name}
        getSub={(r) => r.compound_class || r.molecular_formula || r.smiles}
        onEdit={startEdit}
        onDelete={onDelete}
        editingId={editing?.id}
      />
    </div>
  );
}

// ---------- PLANTS ----------

type PlantRow = { id: string; scientific_name: string; family: string | null; genus: string | null; common_names: string[] | null; local_names: string[] | null; geographic_origin: string | null; habitat: string | null; plant_parts: string[] | null; description: string | null; image_url: string | null };
const EMPTY_PLANT = { scientific_name: "", family: "", genus: "", common_names: "", local_names: "", geographic_origin: "", habitat: "", plant_parts: "", description: "", image_url: "" };

function PlantsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { msg, setMsg } = useSubmitStatus();
  const [editing, setEditing] = useState<PlantRow | null>(null);
  const [f, setF] = useState(EMPTY_PLANT);

  const list = useQuery({
    queryKey: ["admin-plants"],
    queryFn: async () => (await supabase.from("plants").select("*").order("scientific_name").limit(1000)).data as PlantRow[] | null,
  });

  const reset = () => { setEditing(null); setF(EMPTY_PLANT); };
  const startEdit = (r: PlantRow) => {
    setEditing(r);
    setF({
      scientific_name: r.scientific_name, family: r.family ?? "", genus: r.genus ?? "",
      common_names: (r.common_names ?? []).join(", "),
      local_names: (r.local_names ?? []).join(", "),
      geographic_origin: r.geographic_origin ?? "", habitat: r.habitat ?? "",
      plant_parts: (r.plant_parts ?? []).join(", "),
      description: r.description ?? "", image_url: r.image_url ?? "",
    });
    setMsg(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);
    const payload = {
      scientific_name: f.scientific_name, family: f.family || null, genus: f.genus || null,
      common_names: f.common_names ? csv(f.common_names) : null,
      local_names: f.local_names ? csv(f.local_names) : null,
      geographic_origin: f.geographic_origin || null, habitat: f.habitat || null,
      plant_parts: f.plant_parts ? csv(f.plant_parts) : null,
      description: f.description || null, image_url: f.image_url || null,
    };
    const { error } = editing
      ? await supabase.from("plants").update(payload).eq("id", editing.id)
      : await supabase.from("plants").insert({ ...payload, created_by: userId });
    if (error) setMsg({ kind: "err", text: error.message });
    else {
      setMsg({ kind: "ok", text: editing ? `Updated "${f.scientific_name}".` : `Added "${f.scientific_name}".` });
      reset();
      qc.invalidateQueries({ queryKey: ["admin-plants"] });
      qc.invalidateQueries({ queryKey: ["plants"] });
    }
  };

  const onDelete = (r: PlantRow) => confirmDelete(
    r.scientific_name,
    async () => await supabase.from("plants").delete().eq("id", r.id),
    () => { qc.invalidateQueries({ queryKey: ["admin-plants"] }); qc.invalidateQueries({ queryKey: ["plants"] }); if (editing?.id === r.id) reset(); },
    setMsg,
  );

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <FormHeader title={editing ? "Edit plant" : "New plant"} onCancel={editing ? reset : undefined} />
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
          <SubmitRow editing={!!editing} label="plant" />
          <StatusBar msg={msg} />
        </form>

        {editing && (
          <>
            <RelationManager
              title="Compounds in this plant"
              table="plant_compounds"
              ownerColumn="plant_id"
              ownerId={editing.id}
              targetColumn="compound_id"
              targetQueryKey="all-compounds"
              targetTable="compounds"
              targetLabelColumn="name"
              extraFields={[
                { key: "plant_part", label: "Part", placeholder: "leaves, root…" },
                { key: "concentration", label: "Concentration", placeholder: "0.2 % w/w" },
              ]}
            />
            <RelationManager
              title="Pharmacological activities"
              table="plant_activities"
              ownerColumn="plant_id"
              ownerId={editing.id}
              targetColumn="activity_id"
              targetQueryKey="all-acts"
              targetTable="pharmacological_activities"
              targetLabelColumn="name"
              extraFields={[
                { key: "plant_part", label: "Part", placeholder: "leaves, root…" },
                { key: "notes", label: "Notes" },
                { key: "traditional_use", label: "Traditional / ethnobotanical", type: "checkbox" },
              ]}
            />
          </>
        )}
      </div>
      <RecordList<PlantRow>
        title="All plants"
        rows={list.data ?? undefined}
        isLoading={list.isLoading}
        getLabel={(r) => r.scientific_name}
        getSub={(r) => r.family || r.geographic_origin}
        onEdit={startEdit}
        onDelete={onDelete}
        editingId={editing?.id}
      />
    </div>
  );
}

// ---------- ACTIVITIES ----------

type ActivityRow = { id: string; name: string; category: string | null; description: string | null; mechanism: string | null };
const EMPTY_ACTIVITY = { name: "", category: "", description: "", mechanism: "" };

function ActivitiesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { msg, setMsg } = useSubmitStatus();
  const [editing, setEditing] = useState<ActivityRow | null>(null);
  const [f, setF] = useState(EMPTY_ACTIVITY);

  const list = useQuery({
    queryKey: ["admin-activities"],
    queryFn: async () => (await supabase.from("pharmacological_activities").select("*").order("name").limit(1000)).data as ActivityRow[] | null,
  });

  const reset = () => { setEditing(null); setF(EMPTY_ACTIVITY); };
  const startEdit = (r: ActivityRow) => {
    setEditing(r);
    setF({ name: r.name, category: r.category ?? "", description: r.description ?? "", mechanism: r.mechanism ?? "" });
    setMsg(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);
    const payload = { name: f.name, category: f.category || null, description: f.description || null, mechanism: f.mechanism || null };
    const { error } = editing
      ? await supabase.from("pharmacological_activities").update(payload).eq("id", editing.id)
      : await supabase.from("pharmacological_activities").insert({ ...payload, created_by: userId });
    if (error) setMsg({ kind: "err", text: error.message });
    else {
      setMsg({ kind: "ok", text: editing ? `Updated "${f.name}".` : `Added "${f.name}".` });
      reset();
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    }
  };

  const onDelete = (r: ActivityRow) => confirmDelete(
    r.name,
    async () => await supabase.from("pharmacological_activities").delete().eq("id", r.id),
    () => { qc.invalidateQueries({ queryKey: ["admin-activities"] }); qc.invalidateQueries({ queryKey: ["activities"] }); if (editing?.id === r.id) reset(); },
    setMsg,
  );

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <FormHeader title={editing ? "Edit activity" : "New activity"} onCancel={editing ? reset : undefined} />
          <Field label="Activity name" required><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="Antimalarial" /></Field>
          <Field label="Category"><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inputCls} placeholder="Antiparasitic, Antioxidant…" /></Field>
          <Field label="Description"><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} /></Field>
          <Field label="Mechanism"><textarea rows={2} value={f.mechanism} onChange={(e) => setF({ ...f, mechanism: e.target.value })} className={inputCls} /></Field>
          <SubmitRow editing={!!editing} label="activity" />
          <StatusBar msg={msg} />
        </form>

        {editing && (
          <>
            <RelationManager
              title="Compounds with this activity"
              table="compound_activities"
              ownerColumn="activity_id"
              ownerId={editing.id}
              targetColumn="compound_id"
              targetQueryKey="all-compounds"
              targetTable="compounds"
              targetLabelColumn="name"
              extraFields={[
                { key: "potency", label: "Potency", placeholder: "IC50 / MIC" },
                { key: "assay", label: "Assay", placeholder: "in vitro…" },
              ]}
            />
            <RelationManager
              title="Plants with this activity"
              table="plant_activities"
              ownerColumn="activity_id"
              ownerId={editing.id}
              targetColumn="plant_id"
              targetQueryKey="all-plants"
              targetTable="plants"
              targetLabelColumn="scientific_name"
              extraFields={[
                { key: "plant_part", label: "Part", placeholder: "leaves, root…" },
                { key: "notes", label: "Notes" },
                { key: "traditional_use", label: "Traditional / ethnobotanical", type: "checkbox" },
              ]}
            />
          </>
        )}
      </div>
      <RecordList<ActivityRow>
        title="All activities"
        rows={list.data ?? undefined}
        isLoading={list.isLoading}
        getLabel={(r) => r.name}
        getSub={(r) => r.category}
        onEdit={startEdit}
        onDelete={onDelete}
        editingId={editing?.id}
      />
    </div>
  );
}

// ---------- form helpers ----------

function FormHeader({ title, onCancel }: { title: string; onCancel?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold">{title}</h3>
      {onCancel && (
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" /> Cancel edit
        </button>
      )}
    </div>
  );
}
function SubmitRow({ editing, label }: { editing: boolean; label: string }) {
  return (
    <button className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
      {editing ? `Save ${label}` : `Add ${label}`}
    </button>
  );
}

// ---------- citation (create-only, unchanged) ----------

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
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
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

// ---------- link (unchanged) ----------

function LinkForm() {
  const { msg, setMsg } = useSubmitStatus();
  const [kind, setKind] = useState<"plant_compound" | "compound_activity" | "plant_activity">("plant_compound");
  const plants = useQuery({ queryKey: ["all-plants"], queryFn: async () => (await supabase.from("plants").select("id,scientific_name").order("scientific_name").limit(1000)).data ?? [] });
  const compounds = useQuery({ queryKey: ["all-compounds"], queryFn: async () => (await supabase.from("compounds").select("id,name").order("name").limit(1000)).data ?? [] });
  const acts = useQuery({ queryKey: ["all-acts"], queryFn: async () => (await supabase.from("pharmacological_activities").select("id,name").order("name").limit(1000)).data ?? [] });

  const [plantId, setPlantId] = useState("");
  const [compoundId, setCompoundId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [plantPart, setPlantPart] = useState("");
  const [extra, setExtra] = useState("");
  const [traditional, setTraditional] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);

    // Validate per-kind metadata before insert.
    const checks: Array<[string, string | boolean]> = [];
    if (kind === "plant_compound") {
      checks.push(["plant_part", plantPart], ["concentration", extra]);
    } else if (kind === "compound_activity") {
      checks.push(["potency", extra]);
    } else {
      checks.push(["plant_part", plantPart], ["notes", extra], ["traditional_use", traditional]);
    }
    for (const [k, v] of checks) {
      const err = validateRelationField(k, v);
      if (err) { setMsg({ kind: "err", text: err }); return; }
    }

    const partVal = plantPart.trim() || null;
    const extraVal = extra.trim() || null;
    let error: { message: string } | null = null;
    if (kind === "plant_compound") {
      ({ error } = await supabase.from("plant_compounds").insert({ plant_id: plantId, compound_id: compoundId, plant_part: partVal, concentration: extraVal }));
    } else if (kind === "compound_activity") {
      ({ error } = await supabase.from("compound_activities").insert({ compound_id: compoundId, activity_id: activityId, potency: extraVal }));
    } else {
      ({ error } = await supabase.from("plant_activities").insert({ plant_id: plantId, activity_id: activityId, plant_part: partVal, traditional_use: traditional, notes: extraVal }));
    }
    if (error) setMsg({ kind: "err", text: error.message });
    else setMsg({ kind: "ok", text: "Link created." });
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      <Field label="Link type">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={inputCls}>
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

      {(kind === "plant_compound" || kind === "plant_activity") && (
        <Field label="Plant part"><input value={plantPart} onChange={(e) => setPlantPart(e.target.value)} className={inputCls} placeholder="leaves, root…" list="plant-parts-vocab" maxLength={60} /></Field>
      )}
      {kind === "plant_compound" && <Field label="Concentration / notes"><input value={extra} onChange={(e) => setExtra(e.target.value)} className={inputCls} maxLength={100} placeholder="0.2 % w/w" /></Field>}
      {kind === "compound_activity" && <Field label="Potency (IC50, MIC…)"><input value={extra} onChange={(e) => setExtra(e.target.value)} className={inputCls} maxLength={100} placeholder="IC50 12 μM" /></Field>}
      {kind === "plant_activity" && (
        <>
          <Field label="Notes"><input value={extra} onChange={(e) => setExtra(e.target.value)} className={inputCls} maxLength={500} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={traditional} onChange={(e) => setTraditional(e.target.checked)} /> Traditional / ethnobotanical use
          </label>
        </>
      )}
      <datalist id="plant-parts-vocab">
        {ALLOWED_PLANT_PARTS.map((p) => <option key={p} value={p} />)}
      </datalist>


      <button className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Create link</button>
      <StatusBar msg={msg} />
    </form>
  );
}
