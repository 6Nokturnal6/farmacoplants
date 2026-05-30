import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";

export function SearchBar({ scope = "compounds", placeholder, className }: { scope?: "compounds" | "plants" | "activities" | "citations"; placeholder?: string; className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: `/${scope}`, search: { q: q.trim() || undefined } as any });
  };
  return (
    <form onSubmit={submit} className={"flex items-stretch gap-0 " + (className ?? "")}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? "Search…"}
          className="w-full pl-10 pr-4 py-3 rounded-l-md bg-card border border-r-0 border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
      </div>
      <button type="submit" className="px-5 rounded-r-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
        Search
      </button>
    </form>
  );
}
