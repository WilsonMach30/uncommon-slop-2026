import { trialSupabase } from "@/integrations/supabase/trial-client";
import { ensureProfileHistoryRowId } from "@/lib/user-profile-history";

const BUCKET = "images";

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const fromType = file.type.split("/")[1]?.toLowerCase();
  if (fromType) return fromType === "jpeg" ? "jpg" : fromType;
  return "jpg";
}

export async function submitTrialImage(file: File, description: string) {
  const profileHistoryId = await ensureProfileHistoryRowId();
  const ext = fileExtension(file);
  const storagePath = `${profileHistoryId}.${ext}`;

  const { error: uploadError } = await trialSupabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = trialSupabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const imageUrl = urlData.publicUrl;

  const { error: updateError } = await trialSupabase
    .from("user_profile_history")
    .update({
      image_url: imageUrl,
      description: description.trim(),
    })
    .eq("id", profileHistoryId);

  if (updateError) throw updateError;

  return { id: profileHistoryId, imageUrl, storagePath };
}

export type SubmittedTrialImage = Awaited<ReturnType<typeof submitTrialImage>>;

