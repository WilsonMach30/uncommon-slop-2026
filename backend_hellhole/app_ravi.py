import os
import base64
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs.client import ElevenLabs
from anthropic import Anthropic
from elevenlabs.play import play

load_dotenv()

# WRITTEN BY RAVI
USER_LEVEL = 0 # 0 for beginner, 1 for intermediate, 2 for advanced
LANGUAGE = "Arabic"
user_profile_history = f"""
User Info: David, Native English speaker learning {LANGUAGE}.
Level: Advanced.
"""

app = Flask(__name__)
CORS(app)  

claude_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
wafer_client = OpenAI(base_url="https://pass.wafer.ai/v1", api_key=os.getenv("WAFER_API_KEY"))
elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

LIVE_CONVERSATION_CONTEXT = [
    {
        "role": "system", 
        "content": "You are an empathetic, conversational language teacher. Keep the conversation engaging, fluid, and natural."
    }
]

@app.route('/respond-to-voice', methods=['POST'])
def handle_voice_interaction():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file payload found under the key 'audio'"}), 400
            
        audio_file = request.files['audio']
        
        temp_input_path = "temp_user_speech.webm"
        audio_file.save(temp_input_path)

        #STT
        print("Forwarding audio to ElevenLabs Scribe for transcription...")
        with open(temp_input_path, "rb") as audio_data:
            transcription_result = elevenlabs_client.speech_to_text.convert(
                file=audio_data,
                model_id="scribe_v2"  
            )
            
        user_transcribed_text = transcription_result.text
        print(f"User Said: '{user_transcribed_text}'")

        if not user_transcribed_text.strip():
            return jsonify({"error": "Could not decipher any speech from the input audio"}), 400

        # updates history
        LIVE_CONVERSATION_CONTEXT.append({"role": "user", "content": user_transcribed_text})

        # Asking wafer for response
        print("Querying Wafer AI for the next response...")
        wafer_response = wafer_client.chat.completions.create(
            model="Qwen3.5-397B-A17B",
            messages=LIVE_CONVERSATION_CONTEXT  # Feeds full contextual memory array
        )
        ai_reply_text = wafer_response.choices[0].message.content
        print(f"Wafer AI Replied: '{ai_reply_text}'")

        # Append the assistant's reply text back to the context history array
        LIVE_CONVERSATION_CONTEXT.append({"role": "assistant", "content": ai_reply_text})

        # TTS
        print("Generating high-fidelity voice audio via ElevenLabs...")
        audio_stream = elevenlabs_client.text_to_speech.convert(
            text=ai_reply_text,
            voice_id="JBFqnCBsd6RMkjVDRZzb",  # George
            model_id="eleven_v3",
            output_format="mp3_44100_128",
        )

        # Write output stream bytes out to a response audio file
        temp_output_path = "live_ai_response.mp3"
        with open(temp_output_path, "wb") as f:
            for chunk in audio_stream:
                if chunk:
                    f.write(chunk)



        # Clean up the local user input recording file safely
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)

        print("Pipeline complete! Shipping mp3 binary back to front-end.")
        return send_file(temp_output_path, mimetype="audio/mp3")

    except Exception as e:
        print(f"Critical Pipeline Failure: {str(e)}")
        return jsonify({"error": str(e)}), 500

# WRITTEN BY RAVI
def encode_image_to_base64(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")
    
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
    
def claude():
    image_path = "test_dinner.jpg" #INPUT IMAGE
    journal_entry = "Here is the picture of what I made for dinner tonight. Please generate my speaking lesson blueprint."
    image_base64 = encode_image_to_base64(image_path)
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
    claude_response = claude_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=system_prompt_for_blueprint,
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
                    {
                        "type": "text",
                        "text": journal_entry
                    }
                ],
            }
        ],
    )
    return claude_response.content[0].text

def main():
    conversation_blueprint = claude()
    with open(f"claude_output_{LANGUAGE}.txt", "w", encoding="utf-8") as f:
        f.write(conversation_blueprint)

    # with open("claude_output_spanish.txt", "r", encoding="utf-8") as f:
    #     conversation_blueprint = f.read()
    LIVE_CONVERSATION_CONTEXT.append({"role": "system", "content": conversation_blueprint + "\n\n" + difficulty(USER_LEVEL)})

if __name__ == '__main__':
    main()
    app.run(port=5000, debug=True)
