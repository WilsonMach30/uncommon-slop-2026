import { createFileRoute } from "@tanstack/react-router";

// Mock endpoint scaffold for future Wafer LLM streaming integration.
// Returns a canned "dialogue turn" for the active lesson track.
export const Route = createFileRoute("/api/generate-turn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { track?: string; location?: string; theme?: string; userInput?: string } = {};
        try { body = await request.json(); } catch { /* empty */ }

        const { track = "speaking", location = "the village", theme = "", userInput = "" } = body;

        // Stub a canned response — replace with Wafer/Gemini streaming later.
        const speaker = track === "writing" ? "The Scribe" : track === "reading" ? "The Loremaster" : "The Innkeeper";
        const line = userInput
          ? `Hah! "${userInput.slice(0, 80)}"… an interesting turn of phrase. Tell me more — what brings you to ${location}?`
          : `Welcome, traveler. The fires of ${location} are warm tonight${theme ? ` and the talk turns to ${theme}` : ""}. What say you?`;

        return Response.json({
          speaker,
          track,
          text: line,
          choices: [
            { id: "ask",   label: "Ask about the locals" },
            { id: "order", label: "Order something" },
            { id: "leave", label: "Make your excuses and leave" },
          ],
          // Placeholder for future streaming chunks
          stream: false,
        });
      },
    },
  },
});
