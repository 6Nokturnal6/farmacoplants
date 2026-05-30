import { useEffect, useRef, useState } from "react";

interface Props {
  smiles: string;
  width?: number;
  height?: number;
  className?: string;
}

export function SmilesStructure({ smiles, width = 300, height = 240, className }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!smiles || !ref.current) return;
    let cancelled = false;
    setError(false);
    (async () => {
      try {
        const mod = await import("smiles-drawer");
        const SD: any = (mod as any).default ?? mod;
        const drawer = new SD.SvgDrawer({ width, height, padding: 12 });
        SD.parse(
          smiles,
          (tree: unknown) => { if (!cancelled && ref.current) drawer.draw(tree, ref.current, "light"); },
          () => { if (!cancelled) setError(true); }
        );
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [smiles, width, height]);

  if (!smiles) return null;
  if (error) return <div className="text-xs text-destructive">Could not parse SMILES</div>;
  return <svg ref={ref} width={width} height={height} className={className} />;
}
