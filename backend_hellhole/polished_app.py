import os
import base64
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs.client import ElevenLabs
from anthropic import Anthropic

load_dotenv()

# ─────────────────────────────────────────────
# USER CONFIG
# ─────────────────────────────────────────────
USER_LEVEL = 2       # 0 = beginner | 1 = intermediate | 2 = advanced
LANGUAGE   = "Arabic"

user_profile_history = f"""
User Info: David, Native English speaker learning {LANGUAGE}.
Level: Advanced.
"""

# ─────────────────────────────────────────────
# CLIENTS
# ─────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

claude_client     = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
wafer_client      = OpenAI(base_url="https://pass.wafer.ai/v1", api_key=os.getenv("WAFER_API_KEY"))
elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# ─────────────────────────────────────────────
# SESSION STATE
# ─────────────────────────────────────────────
# Rolling user/assistant turns that Wafer sees every call.
# The system message is rebuilt fresh each turn from Claude's directive.
conversation_history: list[dict] = []

# The blueprint Claude produced at startup.
initial_blueprint: str = ""

# One short note per turn that Claude writes after analysing the utterance.
# Passed back to Claude next turn so it tracks skill growth across the session.
claude_session_notes: list[str] = []

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def encode_image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def difficulty(level: int) -> str:
    name = {0: "BEGINNER", 1: "INTERMEDIATE", 2: "ADVANCED"}.get(level, "ADVANCED")
    with open(f"./prompts/{name}.txt", encoding="utf-8") as f:
        return f.read()


# ─────────────────────────────────────────────
# CLAUDE  –  two jobs
# ─────────────────────────────────────────────
def claude_generate_blueprint(image_path: str, journal_entry: str) -> str:
    """
    Startup only.
    Analyses the image + user profile and returns the opening
    Conversation Blueprint that seeds every subsequent Wafer system prompt.
    """
    image_base64 = encode_image_to_base64(image_path)

    system_prompt = f"""
You are the Master Curriculum Director for an AI language-learning app.
Look at the user's profile and the image they uploaded, then produce a
'Conversation Blueprint' that the AI tutor (Wafer) will use.

User Profile & History:
{user_profile_history}

Output exactly these four sections:
1. What the image shows.
2. 3 vocabulary words to practise (drawn from the image).
3. A primary grammatical focus based on the user's known weak points.
4. An engaging opening question in {LANGUAGE} to start the conversation.
"""

    response = claude_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64,
                        },
                    },
                    {"type": "text", "text": journal_entry},
                ],
            }
        ],
    )
    return response.content[0].text.strip()


def claude_produce_turn_directive(user_text: str) -> str:
    """
    Called BEFORE Wafer on every voice turn.

    Claude reads the transcript, the initial blueprint, and all session
    notes accumulated so far, then returns a short directive telling Wafer
    exactly what to say/focus on in its next reply.

    Wafer receives this directive inside its system prompt and produces
    the final reply text that goes straight to ElevenLabs TTS.
    """
    notes_block = (
        "\n".join(f"- {n}" for n in claude_session_notes)
        if claude_session_notes
        else "No notes yet — this is the first turn."
    )

    system_prompt = f"""
You are the Master Curriculum Director for an AI language-learning app.
A separate AI tutor (Wafer) will speak the response aloud to the student.
Your job is to read the student's latest utterance and all accumulated
session notes, then write a SHORT directive (3-6 sentences) telling
Wafer what to do in its very next spoken reply.

The directive must specify:
- Any grammar or vocabulary mistake in the student's utterance that Wafer
  should gently correct or naturally model in its reply.
- The vocabulary word or grammatical structure Wafer should reinforce.
- The conversational tone and the next question Wafer should ask to keep
  the lesson flowing naturally.

Initial conversation blueprint:
{initial_blueprint}

Accumulated session notes (mistakes and progress so far):
{notes_block}

Output ONLY the directive. No preamble, no explanation.
"""

    response = claude_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=400,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": f"Student's latest utterance: {user_text}",
            }
        ],
    )
    directive = response.content[0].text.strip()

    # Archive this directive as a session note so Claude can reference it
    # when producing the directive for the next turn.
    claude_session_notes.append(f"[Turn {len(claude_session_notes) + 1}] {directive}")
    return directive


def build_wafer_system_prompt(turn_directive: str, diff_text: str) -> str:
    """
    Merges the base persona, difficulty rules, and Claude's fresh per-turn
    directive into the single system message Wafer receives each call.
    """
    return (
        f"You are an empathetic, conversational {LANGUAGE} language teacher. "
        "Keep the conversation engaging, fluid, and natural. "
        "Respond only with what you would say aloud — no stage directions, "
        "no bracketed notes, no translations unless the student explicitly asks.\n\n"
        f"=== DIFFICULTY RULES ===\n{diff_text}\n\n"
        "=== CURRICULUM DIRECTOR DIRECTIVE ===\n"
        "The Curriculum Director has analysed the student's latest utterance "
        "and is giving you the following instructions for this reply. Follow them:\n"
        f"{turn_directive}"
    )


# ─────────────────────────────────────────────
# STARTUP  –  Claude generates the blueprint once, then Flask takes over
# ─────────────────────────────────────────────
def main():
    global initial_blueprint

    image_path    = "test_dinner.jpg"
    journal_entry = (
        "Here is the picture of what I made for dinner tonight. "
        "Please generate my speaking lesson blueprint."
    )

    print("🧠 Generating conversation blueprint via Claude...")
    initial_blueprint = claude_generate_blueprint(image_path, journal_entry)

    with open(f"claude_output_{LANGUAGE}.txt", "w", encoding="utf-8") as f:
        f.write(initial_blueprint)
    print(f"📄 Blueprint saved to claude_output_{LANGUAGE}.txt")
    print("✅ Ready. Starting Flask server...\n")


# ─────────────────────────────────────────────
# VOICE ENDPOINT  –  the repeating loop
#
# Every time the user releases the mic button in DialogueBox.tsx this
# endpoint fires and runs the full pipeline, returning a fresh MP3.
#
#   ElevenLabs STT → Claude directive → Wafer reply text → ElevenLabs TTS
# ─────────────────────────────────────────────
@app.route('/respond-to-voice', methods=['POST'])
def handle_voice_interaction():
    temp_input_path  = "temp_user_speech.webm"
    temp_output_path = "live_ai_response.mp3"

    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file found under key 'audio'"}), 400

        request.files['audio'].save(temp_input_path)

        # ── STEP 1: ElevenLabs Scribe  (audio → text) ─────────────────
        print("🦻 Transcribing via ElevenLabs Scribe...")
        with open(temp_input_path, "rb") as f:
            transcription = elevenlabs_client.speech_to_text.convert(
                file=f,
                model_id="scribe_v2",
            )
        user_text = transcription.text.strip()
        print(f"👤 User said: '{user_text}'")

        if not user_text:
            return jsonify({"error": "No speech detected in audio"}), 400

        # ── STEP 2: Claude  (transcript → directive for Wafer) ─────────
        # Claude analyses the utterance against the blueprint + session
        # notes and produces a targeted instruction for Wafer.
        print("🧠 Claude producing turn directive...")
        turn_directive = claude_produce_turn_directive(user_text)
        print(f"📌 Directive: '{turn_directive}'")

        # ── STEP 3: Build Wafer's system prompt from Claude's directive ─
        diff_text     = difficulty(USER_LEVEL)
        system_prompt = build_wafer_system_prompt(turn_directive, diff_text)

        # Add the user's utterance to the rolling conversation history
        conversation_history.append({"role": "user", "content": user_text})

        # ── STEP 4: Wafer  (directive + history → reply text) ──────────
        # Wafer receives Claude's directive in the system prompt and the
        # full conversation history so it has context.  Its reply is the
        # final text that goes straight to ElevenLabs — nothing changes it.
        print("🤖 Querying Wafer AI...")
        wafer_response = wafer_client.chat.completions.create(
            model="Qwen3.5-397B-A17B",
            messages=[
                {"role": "system", "content": system_prompt},
                *conversation_history,
            ],
        )
        ai_reply = wafer_response.choices[0].message.content.strip()
        print(f"📝 Wafer replied: '{ai_reply}'")

        # Save Wafer's reply to history for the next turn
        conversation_history.append({"role": "assistant", "content": ai_reply})

        # ── STEP 5: ElevenLabs TTS  (Wafer's text → audio) ────────────
        # Wafer's reply goes directly into ElevenLabs with no further edits.
        print("🗣️ Synthesising speech via ElevenLabs...")
        audio_stream = elevenlabs_client.text_to_speech.convert(
            text=ai_reply,
            voice_id="JBFqnCBsd6RMkjVDRZzb",   # George
            model_id="eleven_v3",
            output_format="mp3_44100_128",
        )

        with open(temp_output_path, "wb") as f:
            for chunk in audio_stream:
                if chunk:
                    f.write(chunk)

        # ── STEP 6: Cleanup & return MP3 to DialogueBox.tsx ───────────
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)

        print("✅ Pipeline complete — returning MP3.\n")
        return send_file(temp_output_path, mimetype="audio/mp3")

    except Exception as e:
        print(f"❌ Pipeline failure: {e}")
        for p in (temp_input_path, temp_output_path):
            if os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == '__main__':
    main()
    app.run(port=5000, debug=True)