import { createFileRoute, useNavigate } from "@tanstack/react-router";
import QuestRunner from "@/components/QuestRunner";

type QuestSearch = { track?: string; location?: string; language?: string; level?: number; interests?: string };

export const Route = createFileRoute("/quest")({
  validateSearch: (s: Record<string, unknown>): QuestSearch => ({
    track: typeof s.track === "string" ? s.track : undefined,
    location: typeof s.location === "string" ? s.location : undefined,
    language: typeof s.language === "string" ? s.language : undefined,
    level: typeof s.level === "number" ? s.level : undefined,
    interests: typeof s.interests === "string" ? s.interests : undefined,
  }),
  component: QuestRoute,
});

function QuestRoute() {
  const navigate = useNavigate();
  const { track, location, language, level, interests } = Route.useSearch();
  return (
    <QuestRunner
      track={track ?? "speaking"}
      location={location ?? "the tavern"}
      language={language}
      level={level}
      interests={interests}
      onExit={() => navigate({ to: "/map" })}
    />
  );
}
