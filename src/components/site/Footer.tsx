export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-10 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <div className="font-display text-lg font-semibold">FarmacoPlants</div>
          <p className="text-muted-foreground mt-1 max-w-sm">
            An open database of medicinal plants, their chemical constituents, and pharmacological activities — curated at Universidade Lúrio, Mozambique.
          </p>
        </div>
        <div className="text-muted-foreground">
          <div className="font-medium text-foreground mb-1">Hosted at</div>
          farmacoplants.unilurio.ac.mz
        </div>
        <div className="text-muted-foreground">
          <div className="font-medium text-foreground mb-1">Source</div>
          github.com/6Nokturnal6
        </div>
      </div>
    </footer>
  );
}
