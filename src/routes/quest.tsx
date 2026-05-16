import { createFileRoute, useNavigate } from "@tanstack/react-router";
import QuestRunner from "@/components/QuestRunner";

export const Route = createFileRoute("/quest")({
  component: QuestRoute,
});

function QuestRoute() {
  const navigate = useNavigate();
  return <QuestRunner onExit={() => navigate({ to: "/map" })} />;
}
