import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Tracks active session time on page. Every 60s, debounces an update to
// the user_engagement table and bumps daily_progress_percentage toward 100.
export function useSessionTracker(userId: string | null) {
  const [progress, setProgress] = useState(0);
  const [activeMinutes, setActiveMinutes] = useState(0);
  const isActiveRef = useRef(true);
  const sessionRowId = useRef<string | null>(null);
  const sessionStart = useRef<string>(new Date().toISOString());

  // Track tab visibility / window focus
  useEffect(() => {
    const onVisibility = () => { isActiveRef.current = !document.hidden; };
    const onBlur = () => { isActiveRef.current = false; };
    const onFocus = () => { isActiveRef.current = true; };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Debounced push every 60s
    const interval = setInterval(async () => {
      if (cancelled || !isActiveRef.current) return;

      setActiveMinutes((prevMin) => {
        const nextMin = prevMin + 1;
        setProgress((prev) => {
          const next = Math.min(100, prev + 5); // ~20 min to fill
          void pushUpdate(userId, nextMin, next, sessionRowId, sessionStart.current);
          return next;
        });
        return nextMin;
      });
    }, 60_000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [userId]);

  return { progress, activeMinutes, setProgress };
}

async function pushUpdate(
  userId: string,
  activeMinutes: number,
  dailyProgress: number,
  rowIdRef: React.MutableRefObject<string | null>,
  sessionStart: string,
) {
  try {
    if (rowIdRef.current) {
      await supabase
        .from("user_engagement")
        .update({
          active_minutes: activeMinutes,
          daily_progress_percentage: dailyProgress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rowIdRef.current);
    } else {
      const { data } = await supabase
        .from("user_engagement")
        .insert({
          user_id: userId,
          session_start: sessionStart,
          active_minutes: activeMinutes,
          daily_progress_percentage: dailyProgress,
        })
        .select()
        .single();
      if (data) rowIdRef.current = data.id;
    }
  } catch (e) {
    console.warn("[useSessionTracker] update failed", e);
  }
}
