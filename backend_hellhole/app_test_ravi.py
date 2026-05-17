import os, sys
from dotenv import load_dotenv
from openai import OpenAI

sys.stdin.reconfigure(encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

LANGUAGE_NATIVE = "English"
LANGUAGE_TARGET = "Traditional Chinese"
LEVEL = "ADVANCED" #INTERMEDIATE ADVANCED
PAST_CONVO = [] #will be in database at some point
CONVO_HISTORY = []

NUM = 0

wafer_client = OpenAI(base_url="https://pass.wafer.ai/v1", api_key=os.getenv("WAFER_API_KEY"))
GLM_MODEL  = "GLM-5.1"
QWEN_MODEL = "Qwen3.5-397B-A17B"

with open(f"./prompts/{LEVEL}.txt") as f:
    level = f.read()

glm_context = (
    f"You are a conversational language teacher. Your student is currently learning {LANGUAGE_TARGET}."
    "Keep the conversation flowing. Make it sound natural and fluid."
)

qwen_context = (
    f"You are a bilingual friend of a student. The student's native language is {LANGUAGE_NATIVE}."
    f"The student is trying to learn {LANGUAGE_TARGET}. The student is telling you something notable about their life."
    f"Like how you want tell things to a friend in real life, you will be having a conversation with this student about their life."
    f"The only difference is, instead of friends conversing in their native tongue, you will be speaking to the student in {LANGUAGE_TARGET} so they can practice."
)

qwen_init = (
    f"Create a plan for the conversation based on the user's past conversational abilities also attached. You will not actually be carrying out the conversation, you just need to guide the person who will."
    f"CONVERSATION HISTORY: {str(PAST_CONVO)}"
)

glm_init = (
    "This is the general topic/plan for the conversation below. Now, please initiate the conversation by asking about the topic, taking into account what has already been said in this conversation. Like a real conversation, it should not be a long paragraph. You are casually talking to another human."
    f"CONVERSATION LEVEL: {LEVEL}, INSTRUCTIONS: {level}"
)

def qwen_directive(user_entry):
    response = wafer_client.chat.completions.create(
        model=GLM_MODEL,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": qwen_context},
            {"role": "user",   "content": qwen_init + f"\n USER INPUTTED TOPIC:{user_entry}"},
        ],
    )
    directive = response.choices[0].message.content
    if not directive or not directive.strip():
        raise ValueError("QWEN returned an empty directive")
    directive = directive.strip()
    return directive

def qwen_summary():
    global CONVO_HISTORY
    response = wafer_client.chat.completions.create(
        model=GLM_MODEL,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": qwen_context},
            {"role": "user","content": f"This is how the conversation went: {CONVO_HISTORY}. Provide a summary of what the user did great, and what they can work on for next time. The comments you write here will also be read by you when you start the next session."},
        ],
    )
    summary = response.choices[0].message.content
    if not summary or not summary.strip():
        raise ValueError("QWEN returned an empty summary")
    summary = summary.strip()
    print(summary)
    PAST_CONVO.append(summary)

def glm_input(directive, user_input=""):
    response = wafer_client.chat.completions.create(
        model=GLM_MODEL,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": glm_context},
            {"role": "user", "content": glm_init + f"\n CONVERSATION TOPIC: {directive} \n PAST EXCHANGES IN THIS SESSION: {str(CONVO_HISTORY)} \n USER RESPONSE: {user_input}"}
        ],
        extra_body={"enable_thinking": False},
    )
    msg = response.choices[0].message
    # print(msg)
    reply = msg.content
    if not reply or not reply.strip():
        raise ValueError("GLM returned an empty response")
    reply = reply.strip()
    CONVO_HISTORY.append("[FRIEND] "+str(reply))
    return reply

def main():
    global NUM
    user_entry = input("USER ENTRY: ")
    print("QWEN START")
    qwen_out = qwen_directive(user_entry)
    # print(qwen_out)
    while True:
        if NUM > 1:
            decision = input("You have completed the requirements for this conversation! Exit? [Y/N]: ")
            if decision.lower() == "y":
                qwen_summary()
                break
        NUM += 1
        conversation = glm_input(qwen_out, user_entry)
        print(conversation)
        user_entry = input("USER ENTRY: ")
        CONVO_HISTORY.append("[USER] "+str(user_entry))

main()