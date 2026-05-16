import { createFileRoute, useNavigate } from "@tanstack/react-router";
import QuestRunner from "@/components/QuestRunner";

type QuestSearch = { track?: string; location?: string };

export const Route = createFileRoute("/quest")({
  validateSearch: (s: Record<string, unknown>): QuestSearch => ({
    track: typeof s.track === "string" ? s.track : undefined,
    location: typeof s.location === "string" ? s.location : undefined,
  }),
  component: QuestRoute,
});

function QuestRoute() {
  const navigate = useNavigate();
  const { track, location } = Route.useSearch();
  return (
    <QuestRunner
      track={track ?? "speaking"}
      location={location ?? "the tavern"}
      onExit={() => navigate({ to: "/map" })}
    />
  );
}
