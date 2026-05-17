import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

wafer_client = OpenAI(base_url="https://pass.wafer.ai/v1", api_key=os.getenv("WAFER_API_KEY"))

GLM_MODEL  = "GLM-5.1"
QWEN_MODEL = "Qwen3.5-397B-A17B"

SYSTEM_PROMPT = (
    "You are an empathetic, conversational language teacher. "
    "Have a conversation with the student about the following topic by generating questions about what the student is doing"
    "Keep the conversation engaging, fluid, and natural. "
    "As in any conversation, return short exchanges as if you are speaking to a friend"
)

conversation_history: list[dict] = []
glm_session_notes: list[str] = []


def glm_produce_directive(user_text: str) -> str:
    notes_block = (
        "\n".join(f"- {n}" for n in glm_session_notes)
        if glm_session_notes
        else "No notes yet — this is the first turn."
    )

    system = (
        "You are a language tutor. The student is telling you something in their native language. Generate"
        "a general summary for a possible conversation about the topic they mentioned. Another person will actually" \
        "carry out the conversation, but your summary will guide them on what to say."
        f"Session notes so far:\n{notes_block}\n\n"
    )

    response = wafer_client.chat.completions.create(
        model=GLM_MODEL,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": f"Student said: {user_text}"},
        ],
    )
    directive = response.choices[0].message.content
    print(f"[GLM raw] {repr(directive)}")
    if not directive or not directive.strip():
        raise ValueError("GLM returned an empty directive")
    directive = directive.strip()
    glm_session_notes.append(f"[Turn {len(glm_session_notes) + 1}] {directive}")
    return directive


def qwen_reply(user_text: str, directive: str) -> str:
    system = (
        f"{SYSTEM_PROMPT}\n\n"
        "This is the topic:\n"
        f"{directive}"
    )

    conversation_history.append({"role": "user", "content": user_text})

    response = wafer_client.chat.completions.create(
        model=QWEN_MODEL,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": system},
            *conversation_history,
        ],
        extra_body={"enable_thinking": False},
    )
    msg = response.choices[0].message
    print(f"[Qwen message] {msg}")
    reply = msg.content
    if not reply or not reply.strip():
        raise ValueError("Qwen returned an empty response")
    reply = reply.strip()
    conversation_history.append({"role": "assistant", "content": reply})
    return reply

def main():

    directive = ""
    num = 0
    summary = []
    print("=" * 60)
    print("  GLM (director) + Qwen (teacher) — terminal test")
    print("  Type your message and press Enter. Ctrl+C to quit.")
    print("=" * 60)

    while True:
        try:
            user_text = input("\nYou: ").strip()
            summary.append(f"[STUDENT] {user_text}")
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break

        if not user_text:
            continue

        try:
            print(f"\n[GLM] producing directive...")
            directive = glm_produce_directive(user_text)
            print(f"[GLM directive] {directive}")
            while True:
                try:
                    user_text = input("\nYou: ").strip()
                    if not user_text:
                        continue
                    summary.append(f"[STUDENT] {user_text}")
                except (KeyboardInterrupt, EOFError):
                    print("\nExiting.")
                    break
                if num > 3:
                    done = input("[SYSTEM] You have completed this task! You can continue the conversation, or quit here. [Y/N]: ").strip().lower()
                    if done == "n":
                        print("[SYSTEM] Exiting.")
                        break
                print(f"\n[Qwen] generating reply...")
                reply = qwen_reply(user_text, directive)
                summary.append(f"[TEACHER] {reply}")
                print(f"\nTeacher: {reply}")
                num += 1

        except Exception as e:
            print(f"[error] {e}")


if __name__ == "__main__":
    main()
