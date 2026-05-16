# import os
# import base64
# from dotenv import load_dotenv
# from anthropic import Anthropic
# from elevenlabs.client import ElevenLabs
# from elevenlabs.play import play

# from openai import OpenAI

# load_dotenv()

# wafer_client = OpenAI(base_url="https://pass.wafer.ai/v1", 
#                       api_key=os.getenv("WAFER_API_KEY"))

# elevenlabs_client = ElevenLabs(
#   api_key=os.getenv("ELEVENLABS_API_KEY"),
# )

# print("Asking Wafer ...")

# wafer_response = wafer_client.chat.completions.create(
#     model="Qwen3.5-397B-A17B",
#     messages=[
#         {"role": "system", "content": "You are an empathetic, conversational language teacher."},
#         {"role": "user", "content": "Give me a one-sentence inspiring icebreaker to start our speaking lesson."}
#     ]
# )

# ai_text_response = wafer_response.choices[0].message.content
# print(f"📝 Wafer AI Said: '{ai_text_response}'")


# print("🗣️ Sending text to ElevenLabs...")



# # audio = elevenlabs.text_to_speech.convert(
# #     text="The first move is what sets everything in motion.",
# #     voice_id="JBFqnCBsd6RMkjVDRZzb",  # "George" - browse voices at elevenlabs.io/app/voice-library
# #     model_id="eleven_v3",
# #     output_format="mp3_44100_128",
# # )

# # play(audio)

# audio = elevenlabs_client.text_to_speech.convert(
#     text=ai_text_response,
#     voice_id="JBFqnCBsd6RMkjVDRZzb",  # "George"
#     model_id="eleven_v3",
#     output_format="mp3_44100_128",
# )

# print("🔊 Playing Audio...")
# play(audio)

import os
import base64
from dotenv import load_dotenv
from anthropic import Anthropic       # The official Claude SDK
from openai import OpenAI             # Used to connect to Wafer AI
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play

# Load keys from .env
load_dotenv()

# Initialize all 3 clients
claude_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
wafer_client = OpenAI(base_url="https://pass.wafer.ai/v1", api_key=os.getenv("WAFER_API_KEY"))
elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# Helper function to encode an image file to base64 for Claude
def encode_image_to_base64(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

USER_LEVEL = 2
def difficulty(level):
    print(level)
    if level == 0:
        name = "BEGINNER"
    elif level == 1:
        name = "INTERMEDIATE"
    else:
        name = "ADVANCED"
    with open(f"./prompts/{name}.txt") as f:
        f = f.read()
        return f

# ==========================================
# 1. THE SIMULATED DATABASE (History & Input)
# ==========================================
# In production, you would fetch this from your database (PostgreSQL/Supabase)
user_profile_history = """
User Info: David, Native English speaker learning Arabic.
Level: Advanced.
Past topics discussed: Ordered coffee yesterday, talked about his dog last week.
Common mistakes: Forgets to use 'stare' vs 'essere' when talking about locations.
"""

# Let's say the user just uploaded an image of a homemade pizza
image_path = "test_dinner.jpg"  # Replace with a real image path on your machine

print("🖼️ Encoding image and preparing conversation history...")
image_base64 = encode_image_to_base64(image_path)


# ==========================================
# 2. CLAUDE CREATES THE PERSONALIZED BLUEPRINT
# ==========================================
print("🧠 Claude is analyzing history, the image, and building the lesson blueprint...")

system_prompt_for_blueprint = f"""
You are the Master Curriculum Director for an AI language learning app. 
Your job is to look at the user's profile/history and the new image they uploaded.
You must output a highly tailored 'Conversation Blueprint' for a different AI (Wafer AI) to use.

User Profile & History:
{user_profile_history}

Analyze the image and user history, then output:
1. What the image shows.
2. 3 specific vocabulary words they should practice based on the image.
3. A primary grammatical focus based on their past mistakes.
4. An engaging, natural conversational opening question in their target language.
"""

# Call Claude 3.5 Sonnet to handle the high-level reasoning
# claude_response = claude_client.messages.create(
#     model="claude-sonnet-4-20250514",
#     max_tokens=1000,
#     system=system_prompt_for_blueprint,
#     messages=[
#         {
#             "role": "user",
#             "content": [
#                 {
#                     "type": "image",
#                     "source": {
#                         "type": "base64",
#                         "media_type": "image/jpeg",
#                         "data": image_base64,
#                     },
#                 },
#                 {
#                     "type": "text",
#                     "text": "Here is the picture of what I made for dinner tonight. Please generate my speaking lesson blueprint."
#                 }
#             ],
#         }
#     ],
# )

# conversation_blueprint = claude_response.content[0].text
# print("\n📋 --- CLAUDE GENERATED BLUEPRINT ---")
# print(conversation_blueprint)
# print("--------------------------------------\n")

# with open("claude_output_arabic.txt", "w", encoding="utf-8") as f:
#     f.write(conversation_blueprint)

with open("claude_output_spanish.txt", "r", encoding="utf-8") as f:
    conversation_blueprint = f.read()
    conversation_blueprint += str(conversation_blueprint) + "\n\n" + difficulty(USER_LEVEL)
    # print(conversation_blueprint)

# ==========================================
# 3. WAFER AI TAKES OVER FOR THE LIVE SPEECH
# ==========================================
print("🤖 Passing the blueprint to Wafer AI for instant conversation generation...")

# We feed Wafer AI the blueprint designed by Claude so it knows exactly how to act
wafer_response = wafer_client.chat.completions.create(
    model="Qwen3.5-397B-A17B",
    messages=[
        {
            "role": "system", 
            "content": f"You are a friendly live language tutor. Use this background blueprint to start a speech session: {conversation_blueprint}"
        },
        {
            "role": "user", 
            "content": "Start the session now!"
        }
    ]
)

ai_text_response = wafer_response.choices[0].message.content
print(f"📝 Wafer AI Generated Speech")

with open("wafer.txt","w", encoding="utf-8") as f:
    f.write(ai_text_response)

# ==========================================
# 4. ELEVENLABS PLAYS THE VOICE
# ==========================================
print("🗣️ ElevenLabs is speaking...")
audio = elevenlabs_client.text_to_speech.convert(
    text=ai_text_response,
    voice_id="JBFqnCBsd6RMkjVDRZzb",  # George
    model_id="eleven_v3",
    output_format="mp3_44100_128",
)

play(audio)