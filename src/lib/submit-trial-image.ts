import { trialSupabase } from "@/integrations/supabase/trial-client";

const BUCKET = "images";

function uniqueId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const fromType = file.type.split("/")[1]?.toLowerCase();
  if (fromType) return fromType === "jpeg" ? "jpg" : fromType;
  return "jpg";
}

export async function submitTrialImage(file: File, description: string) {
  const storagePath = `${uniqueId()}.${fileExtension(file)}`;

  const { error: uploadError } = await trialSupabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = trialSupabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { error: insertError } = await trialSupabase.from("images").insert({
    image_url: urlData.publicUrl,
    description: description.trim(),
  });

  if (insertError) throw insertError;

  return { imageUrl: urlData.publicUrl, storagePath };
}
