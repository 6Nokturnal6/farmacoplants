import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PLANT_IMAGES_BUCKET = "plant-images";

function isHttpUrl(v: string) {
  return /^https?:\/\//i.test(v);
}

export async function resolvePlantImageUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (isHttpUrl(value)) return value;
  const { data, error } = await supabase.storage.from(PLANT_IMAGES_BUCKET).createSignedUrl(value, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function PlantImage({ value, alt, className }: { value: string | null | undefined; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    resolvePlantImageUrl(value).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [value]);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}

export async function uploadPlantImage(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from(PLANT_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}
