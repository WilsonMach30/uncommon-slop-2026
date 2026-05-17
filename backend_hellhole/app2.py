import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs.client import ElevenLabs

load_dotenv()

app = Flask(__name__)
CORS(app)

wafer_client      = OpenAI(base_url="https://pass.wafer.ai/v1", api_key=os.getenv("WAFER_API_KEY"))
elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

GLM_MODEL  = "GLM-5.1"
QWEN_MODEL = "Qwen3.5-397B-A17B"

EXIT_AFTER_TURNS = 3  # frontend shows exit option after this many turns

# ─────────────────────────────────────────────
# SESSION STATE  (reset each /start-session)
# ─────────────────────────────────────────────
PAST_CONVO:       list[str]  = []   # summaries carried across sessions
CONVO_HISTORY:    list[str]  = []   # [FRIEND]/[USER] labelled turns this session
oai_history:      list[dict] = []   # OpenAI-format messages for Qwen
session_directive: str       = ""
turn_count:        int       = 0
LANGUAGE_NATIVE:   str       = "English"
LANGUAGE_TARGET:   str       = "Spanish"
LEVEL:             str       = "BEGINNER"


def load_level(level: str) -> str:
    path = f"./prompts/{level.upper()}.txt"
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"Level: {level}."


# ─────────────────────────────────────────────
# GLM  —  generates the conversation directive ONCE per session
# ─────────────────────────────────────────────
def glm_generate_directive(topic: str) -> str:
    past_block = "\n".join(PAST_CONVO) if PAST_CONVO else "No past sessions yet."

    system = (
        f"You are a bilingual friend of a student. The student's native language is {LANGUAGE_NATIVE}. "
        f"The student is trying to learn {LANGUAGE_TARGET}. "
        "The student is telling you something notable about their life. "
        "Create a plan for the conversation based on the user's topic and their past conversational history. "
        "You will NOT carry out the conversation — you just need to guide the person who will.\n\n"
        f"PAST SESSION SUMMARIES:\n{past_block}"
    )
    user = f"USER TOPIC: {topic}"

    response = wafer_client.chat.completions.create(
        model=GLM_MODEL,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    )
    content = response.choices[0].message.content
    print(f"[GLM directive raw] {repr(content)}")
    if not content or not content.strip():
        raise ValueError("GLM returned an empty directive")
    return content.strip()


# ─────────────────────────────────────────────
# QWEN  —  speaks to the user every turn
# ─────────────────────────────────────────────
def qwen_speak(user_text: str) -> str:
    level_rules = load_level(LEVEL)

    system = (
        f"You are a bilingual friend of a student. The student's native language is {LANGUAGE_NATIVE}. "
        f"The student is trying to learn {LANGUAGE_TARGET}. Like a real conversation with a friend, "
        f"keep exchanges short and natural. Speak to the student in {LANGUAGE_TARGET} so they can practise.\n\n"
        f"CONVERSATION LEVEL: {LEVEL}\nINSTRUCTIONS: {level_rules}\n\n"
        "This is the general topic/plan for the conversation. Respond to the student's message, "
        "keeping the conversation on topic. Do not write long paragraphs — talk like a friend.\n\n"
        f"CONVERSATION TOPIC/PLAN:\n{session_directive}\n\n"
        f"PAST EXCHANGES THIS SESSION:\n{chr(10).join(CONVO_HISTORY) if CONVO_HISTORY else 'None yet.'}"
    )

    oai_history.append({"role": "user", "content": user_text})

    response = wafer_client.chat.completions.create(
        model=QWEN_MODEL,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": system},
            *oai_history,
        ],
        extra_body={"enable_thinking": False},
    )
    msg = response.choices[0].message
    reply = msg.content
    print(f"[Qwen raw] {repr(reply)}")
    if not reply or not reply.strip():
        raise ValueError("Qwen returned an empty response")
    reply = reply.strip()
    oai_history.append({"role": "assistant", "content": reply})
    return reply


# ─────────────────────────────────────────────
# GLM  —  generates end-of-session summary
# ─────────────────────────────────────────────
def glm_generate_summary() -> str:
    system = (
        f"You are a bilingual friend of a student learning {LANGUAGE_TARGET}. "
        "Provide a summary of what the user did great and what they can work on for next time. "
        "These comments will also be read by you when you start the next session."
    )
    user = f"This is how the conversation went:\n{chr(10).join(CONVO_HISTORY)}"

    response = wafer_client.chat.completions.create(
        model=GLM_MODEL,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    )
    content = response.choices[0].message.content
    print(f"[GLM summary raw] {repr(content)}")
    if not content or not content.strip():
        raise ValueError("GLM returned an empty summary")
    return content.strip()


def reset_session():
    global CONVO_HISTORY, oai_history, session_directive, turn_count
    CONVO_HISTORY     = []
    oai_history       = []
    session_directive = ""
    turn_count        = 0


def synthesise(text: str) -> str:
    audio_stream = elevenlabs_client.text_to_speech.convert(
        text=text,
        voice_id="JBFqnCBsd6RMkjVDRZzb",  # George
        model_id="eleven_turbo_v2_5",
        output_format="mp3_44100_128",
    )
    audio_bytes = b"".join(chunk for chunk in audio_stream if chunk)
    return base64.b64encode(audio_bytes).decode("utf-8")


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@app.route('/start-session', methods=['POST'])
def start_session():
    """
    Call once before the conversation begins.
    Body: { topic, language_native?, language_target?, level? }
    Returns: { reply, audio } — Qwen's opening message.
    """
    global LANGUAGE_NATIVE, LANGUAGE_TARGET, LEVEL, session_directive, turn_count

    reset_session()

    data             = request.json or {}
    topic            = data.get("topic", "")
    LANGUAGE_NATIVE  = data.get("language_native", "English")
    LANGUAGE_TARGET  = data.get("language_target", "Spanish")
    LEVEL            = data.get("level", "BEGINNER").upper()

    if not topic:
        return jsonify({"error": "topic is required"}), 400

    try:
        print("🧠 GLM generating session directive...")
        session_directive = glm_generate_directive(topic)
        print(f"📌 Directive: {session_directive}")

        print("🤖 Qwen opening the conversation...")
        opening = qwen_speak(topic)
        CONVO_HISTORY.append(f"[USER] {topic}")
        CONVO_HISTORY.append(f"[FRIEND] {opening}")
        turn_count = 1

        print("🗣️ Synthesising opening...")
        audio = synthesise(opening)

        return jsonify({"reply": opening, "audio": audio})

    except Exception as e:
        print(f"❌ start-session failure: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/respond-to-voice', methods=['POST'])
def handle_voice_interaction():
    """
    Call on every voice turn after /start-session.
    Returns: { transcript, reply, audio, turn, can_exit }
    """
    global turn_count
    temp_input_path = "temp_user_speech2.webm"

    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file found under key 'audio'"}), 400

        request.files['audio'].save(temp_input_path)

        # STT
        print("🦻 Transcribing...")
        with open(temp_input_path, "rb") as f:
            transcription = elevenlabs_client.speech_to_text.convert(file=f, model_id="scribe_v2")
        user_text = transcription.text.strip()
        print(f"👤 User said: '{user_text}'")
        if not user_text:
            return jsonify({"error": "No speech detected"}), 400

        CONVO_HISTORY.append(f"[USER] {user_text}")

        # Qwen reply
        print("🤖 Qwen replying...")
        reply = qwen_speak(user_text)
        CONVO_HISTORY.append(f"[FRIEND] {reply}")
        turn_count += 1

        # TTS
        print("🗣️ Synthesising...")
        audio = synthesise(reply)

        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)

        print(f"✅ Turn {turn_count} complete.\n")
        return jsonify({
            "transcript": user_text,
            "reply":      reply,
            "audio":      audio,
            "turn":       turn_count,
            "can_exit":   turn_count >= EXIT_AFTER_TURNS,
        })

    except Exception as e:
        print(f"❌ Pipeline failure: {e}")
        if os.path.exists(temp_input_path):
            try: os.remove(temp_input_path)
            except OSError: pass
        return jsonify({"error": str(e)}), 500


@app.route('/end-session', methods=['POST'])
def end_session():
    """
    Call when the user chooses to exit.
    Generates a summary, saves it to PAST_CONVO, resets the session.
    Returns: { summary }
    """
    try:
        if not CONVO_HISTORY:
            return jsonify({"error": "No conversation to summarise"}), 400

        print("🧠 GLM generating session summary...")
        summary = glm_generate_summary()
        PAST_CONVO.append(summary)
        print(f"📄 Summary saved. Total past sessions: {len(PAST_CONVO)}")

        reset_session()
        return jsonify({"summary": summary})

    except Exception as e:
        print(f"❌ end-session failure: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(port=5001, debug=True)
