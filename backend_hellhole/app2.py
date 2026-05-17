import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs.client import ElevenLabs

load_dotenv()

USER_LEVEL = 2       # 0 = beginner | 1 = intermediate | 2 = advanced
LANGUAGE   = "Arabic"

user_profile_history = f"""
User Info: David, Native English speaker learning {LANGUAGE}.
Level: Advanced.
"""

app = Flask(__name__)
CORS(app)

wafer_client      = OpenAI(base_url="https://pass.wafer.ai/v1", api_key=os.getenv("WAFER_API_KEY"))
elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

GLM_MODEL  = "GLM-5.1"
QWEN_MODEL = "Qwen3.5-397B-A17B"

conversation_history: list[dict] = []
initial_blueprint: str = ""
glm_session_notes: list[str] = []


def wafer_call(model: str, system: str, user: str, max_tokens: int = 1024) -> str:
    response = wafer_client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    )
    content = response.choices[0].message.content
    if not content or not content.strip():
        raise ValueError(f"{model} returned an empty response")
    return content.strip()


def encode_image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def difficulty(level: int) -> str:
    name = {0: "BEGINNER", 1: "INTERMEDIATE", 2: "ADVANCED"}.get(level, "ADVANCED")
    with open(f"./prompts/{name}.txt", encoding="utf-8") as f:
        return f.read()


# ─────────────────────────────────────────────
# GLM JOB 1 — startup blueprint (same role as Claude in polished_app.py)
# ─────────────────────────────────────────────
def glm_generate_blueprint(image_path: str, journal_entry: str) -> str:
    image_base64 = encode_image_to_base64(image_path)

    system_prompt = f"""
You are the Master Curriculum Director for an AI language-learning app.
Look at the user's profile and the image they uploaded, then produce a
'Conversation Blueprint' that the AI tutor (Wafer/Qwen) will use.

User Profile & History:
{user_profile_history}

Output exactly these four sections:
1. What the image shows.
2. 3 vocabulary words to practise (drawn from the image).
3. A primary grammatical focus based on the user's known weak points.
4. An engaging opening question in {LANGUAGE} to start the conversation.
"""

    # GLM via Wafer — vision call using base64 image
    response = wafer_client.chat.completions.create(
        model=GLM_MODEL,
        max_tokens=1000,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                    },
                    {"type": "text", "text": journal_entry},
                ],
            },
        ],
    )
    content = response.choices[0].message.content
    if not content or not content.strip():
        raise ValueError("GLM returned an empty blueprint")
    return content.strip()


# ─────────────────────────────────────────────
# GLM JOB 2 — per-turn directive (same role as Claude in polished_app.py)
# ─────────────────────────────────────────────
def glm_produce_turn_directive(user_text: str) -> str:
    notes_block = (
        "\n".join(f"- {n}" for n in glm_session_notes)
        if glm_session_notes
        else "No notes yet — this is the first turn."
    )

    system_prompt = f"""
You are the Master Curriculum Director for an AI language-learning app.
A separate AI tutor (Qwen) will speak the response aloud to the student.
Your job is to read the student's latest utterance and all accumulated
session notes, then write a SHORT directive (3-6 sentences) telling
Qwen what to do in its very next spoken reply.

The directive must specify:
- Any grammar or vocabulary mistake in the student's utterance that Qwen
  should gently correct or naturally model in its reply.
- The vocabulary word or grammatical structure Qwen should reinforce.
- The conversational tone and the next question Qwen should ask to keep
  the lesson flowing naturally.

Initial conversation blueprint:
{initial_blueprint}

Accumulated session notes (mistakes and progress so far):
{notes_block}

Output ONLY the directive. No preamble, no explanation.
"""

    directive = wafer_call(GLM_MODEL, system_prompt, f"Student's latest utterance: {user_text}", max_tokens=400)
    glm_session_notes.append(f"[Turn {len(glm_session_notes) + 1}] {directive}")
    return directive


def build_qwen_system_prompt(turn_directive: str, diff_text: str) -> str:
    return (
        f"You are an empathetic, conversational {LANGUAGE} language teacher. "
        "Keep the conversation engaging, fluid, and natural. "
        "Respond only with what you would say aloud — no stage directions, "
        "no bracketed notes, no translations unless the student explicitly asks. "
        "Reply in 1-2 short sentences only — never more.\n\n"
        f"=== DIFFICULTY RULES ===\n{diff_text}\n\n"
        "=== CURRICULUM DIRECTOR DIRECTIVE ===\n"
        "The Curriculum Director has analysed the student's latest utterance "
        "and is giving you the following instructions for this reply. Follow them:\n"
        f"{turn_directive}"
    )


# ─────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────
def main():
    global initial_blueprint

    image_path    = "test_dinner.jpg"
    journal_entry = (
        "Here is the picture of what I made for dinner tonight. "
        "Please generate my speaking lesson blueprint."
    )

    print("🧠 GLM generating conversation blueprint...")
    initial_blueprint = glm_generate_blueprint(image_path, journal_entry)

    with open(f"glm_output_{LANGUAGE}.txt", "w", encoding="utf-8") as f:
        f.write(initial_blueprint)
    print(f"📄 Blueprint saved to glm_output_{LANGUAGE}.txt")
    print("✅ Ready. Starting Flask server...\n")


# ─────────────────────────────────────────────
# VOICE ENDPOINT
#   ElevenLabs STT → GLM directive → Qwen reply → ElevenLabs TTS
# ─────────────────────────────────────────────
@app.route('/respond-to-voice', methods=['POST'])
def handle_voice_interaction():
    temp_input_path = "temp_user_speech2.webm"

    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file found under key 'audio'"}), 400

        request.files['audio'].save(temp_input_path)

        # STEP 1: STT
        print("🦻 Transcribing via ElevenLabs Scribe...")
        with open(temp_input_path, "rb") as f:
            transcription = elevenlabs_client.speech_to_text.convert(file=f, model_id="scribe_v2")
        user_text = transcription.text.strip()
        print(f"👤 User said: '{user_text}'")

        if not user_text:
            return jsonify({"error": "No speech detected in audio"}), 400

        # STEP 2: GLM produces directive
        print("🧠 GLM producing turn directive...")
        turn_directive = glm_produce_turn_directive(user_text)
        print(f"📌 Directive: '{turn_directive}'")

        # STEP 3: Build Qwen's system prompt
        diff_text     = difficulty(USER_LEVEL)
        system_prompt = build_qwen_system_prompt(turn_directive, diff_text)

        conversation_history.append({"role": "user", "content": user_text})

        # STEP 4: Qwen generates the spoken reply
        print("🤖 Querying Qwen...")
        qwen_response = wafer_client.chat.completions.create(
            model=QWEN_MODEL,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": system_prompt},
                *conversation_history,
            ],
        )
        ai_reply = qwen_response.choices[0].message.content
        print(f"📝 Qwen raw content: {repr(ai_reply)}")
        if not ai_reply or not ai_reply.strip():
            return jsonify({"error": "Qwen returned an empty response"}), 500
        ai_reply = ai_reply.strip()

        conversation_history.append({"role": "assistant", "content": ai_reply})

        # STEP 5: TTS
        print("🗣️ Synthesising speech via ElevenLabs...")
        audio_stream = elevenlabs_client.text_to_speech.convert(
            text=ai_reply,
            voice_id="JBFqnCBsd6RMkjVDRZzb",  # George
            model_id="eleven_turbo_v2_5",
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(chunk for chunk in audio_stream if chunk)

        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)

        print("✅ Pipeline complete.\n")
        return jsonify({
            "transcript": user_text,
            "reply": ai_reply,
            "audio": base64.b64encode(audio_bytes).decode("utf-8"),
        })

    except Exception as e:
        print(f"❌ Pipeline failure: {e}")
        if os.path.exists(temp_input_path):
            try:
                os.remove(temp_input_path)
            except OSError:
                pass
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    main()
    app.run(port=5001, debug=True)
