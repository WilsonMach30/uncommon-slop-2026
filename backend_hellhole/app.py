# import os
# from flask import Flask, request, send_file, jsonify
# from flask_cors import CORS
# from dotenv import load_dotenv
# from openai import OpenAI
# from elevenlabs.client import ElevenLabs

# # Load API credentials from the environment
# load_dotenv()

# app = Flask(__name__)
# CORS(app)  # Allows your detached front-end framework to securely hit this API

# # 1. Initialize Clients
# # Wafer handles the LLM processing using standard OpenAI bindings
# wafer_client = OpenAI(
#     base_url="https://pass.wafer.ai/v1", 
#     api_key=os.getenv("WAFER_API_KEY")
# )

# # ElevenLabs handles BOTH Speech-To-Text AND Text-To-Speech
# elevenlabs_client = ElevenLabs(
#     api_key=os.getenv("ELEVENLABS_API_KEY"),
# )

# # 2. In-Memory Live Conversation Chain
# # This list tracks the chat history so the AI has continuous memory of the dialogue
# LIVE_CONVERSATION_CONTEXT = [
#     {
#         "role": "system", 
#         "content": "You are an empathetic, conversational language teacher. Keep the conversation engaging, fluid, and natural."
#     }
# ]

# @app.route('/respond-to-voice', methods=['POST'])
# def handle_voice_interaction():
#     try:
#         # Check if the frontend sent the audio blob correctly
#         if 'audio' not in request.files:
#             return jsonify({"error": "No audio file payload found under the key 'audio'"}), 400
            
#         audio_file = request.files['audio']
        
#         # Save incoming microphone audio temporarily to disk
#         temp_input_path = "temp_user_speech.webm"
#         audio_file.save(temp_input_path)

#         # -------------------------------------------------------------
#         # STEP 1: ELEVENLABS SCRIBE (SPEECH-TO-TEXT)
#         # -------------------------------------------------------------
#         print("🦻 Forwarding audio to ElevenLabs Scribe for transcription...")
#         with open(temp_input_path, "rb") as audio_data:
#             transcription_result = elevenlabs_client.speech_to_text.convert(
#                 file=audio_data,
#                 model_id="scribe_v2"  # ElevenLabs Scribe's high-accuracy, low-latency engine
#             )
            
#         user_transcribed_text = transcription_result.text
#         print(f"👤 User Said: '{user_transcribed_text}'")

#         # If the microphone recording was empty/silent, abort early to save tokens
#         if not user_transcribed_text.strip():
#             return jsonify({"error": "Could not decipher any speech from the input audio"}), 400

#         # -------------------------------------------------------------
#         # STEP 2: UPDATE WAFER AI CONVERSATION HISTORY
#         # -------------------------------------------------------------
#         # Append the user's fresh spoken input text to the ongoing context array
#         LIVE_CONVERSATION_CONTEXT.append({"role": "user", "content": user_transcribed_text})

#         # -------------------------------------------------------------
#         # STEP 3: CONSULT WAFER AI FOR THE RESPONSE
#         # -------------------------------------------------------------
#         print("🤖 Querying Wafer AI for the next response...")
#         wafer_response = wafer_client.chat.completions.create(
#             model="Qwen3.5-397B-A17B",
#             messages=LIVE_CONVERSATION_CONTEXT  # Feeds full contextual memory array
#         )
#         ai_reply_text = wafer_response.choices[0].message.content
#         print(f"📝 Wafer AI Replied: '{ai_reply_text}'")

#         # Append the assistant's reply text back to the context history array
#         LIVE_CONVERSATION_CONTEXT.append({"role": "assistant", "content": ai_reply_text})

#         # -------------------------------------------------------------
#         # STEP 4: ELEVENLABS (TEXT-TO-SPEECH)
#         # -------------------------------------------------------------
#         print("🗣️ Generating high-fidelity voice audio via ElevenLabs...")
#         audio_stream = elevenlabs_client.text_to_speech.convert(
#             text=ai_reply_text,
#             voice_id="JBFqnCBsd6RMkjVDRZzb",  # George
#             model_id="eleven_v3",
#             output_format="mp3_44100_128",
#         )

#         # Write output stream bytes out to a response audio file
#         temp_output_path = "live_ai_response.mp3"
#         with open(temp_output_path, "wb") as f:
#             for chunk in audio_stream:
#                 if chunk:
#                     f.write(chunk)

#         # -------------------------------------------------------------
#         # STEP 5: CLEANUP AND DISPATCH AUDIO TO FRONTEND
#         # -------------------------------------------------------------
#         # Clean up the local user input recording file safely
#         if os.path.exists(temp_input_path):
#             os.remove(temp_input_path)

#         print("✅ Pipeline complete! Shipping mp3 binary back to front-end.")
#         return send_file(temp_output_path, mimetype="audio/mp3")

#     except Exception as e:
#         print(f"❌ Critical Pipeline Failure: {str(e)}")
#         return jsonify({"error": str(e)}), 500

# if __name__ == '__main__':
#     # Starts your server locally on http://127.0.0.1:5000
#     app.run(port=5000, debug=True)

import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs.client import ElevenLabs

# Load API credentials from the environment
load_dotenv()

app = Flask(__name__)
CORS(app)  # Allows your detached front-end framework to securely hit this API

# 1. Initialize Clients
# Wafer handles the LLM processing using standard OpenAI bindings
wafer_client = OpenAI(
    base_url="https://pass.wafer.ai/v1", 
    api_key=os.getenv("WAFER_API_KEY")
)

# ElevenLabs handles BOTH Speech-To-Text AND Text-To-Speech
elevenlabs_client = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY"),
)

# 2. In-Memory Live Conversation Chain
# This list tracks the chat history so the AI has continuous memory of the dialogue
LIVE_CONVERSATION_CONTEXT = [
    {
        "role": "system",
        "content": "You are an empathetic, conversational language teacher. Keep the conversation engaging, fluid, and natural. Reply in 1-2 short sentences only — never more."
    }
]

@app.route('/respond-to-voice', methods=['POST'])
def handle_voice_interaction():
    try:
        # Check if the frontend sent the audio blob correctly
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file payload found under the key 'audio'"}), 400
            
        audio_file = request.files['audio']
        
        # Save incoming microphone audio temporarily to disk
        temp_input_path = "temp_user_speech.webm"
        audio_file.save(temp_input_path)

        # -------------------------------------------------------------
        # STEP 1: ELEVENLABS SCRIBE (SPEECH-TO-TEXT)
        # -------------------------------------------------------------
        print("🦻 Forwarding audio to ElevenLabs Scribe for transcription...")
        with open(temp_input_path, "rb") as audio_data:
            transcription_result = elevenlabs_client.speech_to_text.convert(
                file=audio_data,
                model_id="scribe_v2"  # ElevenLabs Scribe's high-accuracy, low-latency engine
            )
            
        user_transcribed_text = transcription_result.text
        print(f"👤 User Said: '{user_transcribed_text}'")

        # If the microphone recording was empty/silent, abort early to save tokens
        if not user_transcribed_text.strip():
            return jsonify({"error": "Could not decipher any speech from the input audio"}), 400

        # -------------------------------------------------------------
        # STEP 2: UPDATE WAFER AI CONVERSATION HISTORY
        # -------------------------------------------------------------
        # Append the user's fresh spoken input text to the ongoing context array
        LIVE_CONVERSATION_CONTEXT.append({"role": "user", "content": user_transcribed_text})

        # -------------------------------------------------------------
        # STEP 3: CONSULT WAFER AI FOR THE RESPONSE (TOKEN SAVING MODE)
        # -------------------------------------------------------------
        print("🤖 Fetching response layout (Token-Saving Mode)...")
        
        # --- ORIGINAL API CALL (Commented out to save tokens) ---
        wafer_response = wafer_client.chat.completions.create(
            model="Qwen3.5-397B-A17B",
            messages=LIVE_CONVERSATION_CONTEXT,
            max_tokens=1024,
        )
        ai_reply_text = wafer_response.choices[0].message.content
        print(f"📝 Wafer raw content: {repr(ai_reply_text)}")
        if not ai_reply_text or not ai_reply_text.strip():
            return jsonify({"error": "LLM returned an empty response"}), 500
        ai_reply_text = ai_reply_text.strip()

        # Append the assistant's reply text back to the context history array
        LIVE_CONVERSATION_CONTEXT.append({"role": "assistant", "content": ai_reply_text})

        # -------------------------------------------------------------
        # STEP 4: ELEVENLABS (TEXT-TO-SPEECH)
        # -------------------------------------------------------------
        print("🗣️ Generating high-fidelity voice audio via ElevenLabs...")
        audio_stream = elevenlabs_client.text_to_speech.convert(
            text=ai_reply_text,
            voice_id="JBFqnCBsd6RMkjVDRZzb",  # George
            model_id="eleven_turbo_v2_5",
            output_format="mp3_44100_128",
        )

        audio_bytes = b"".join(chunk for chunk in audio_stream if chunk)

        # -------------------------------------------------------------
        # STEP 5: CLEANUP AND DISPATCH JSON TO FRONTEND
        # -------------------------------------------------------------
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)

        print("✅ Pipeline complete! Shipping JSON response back to front-end.")
        return jsonify({
            "transcript": user_transcribed_text,
            "reply": ai_reply_text,
            "audio": base64.b64encode(audio_bytes).decode("utf-8"),
        })

    except Exception as e:
        print(f"❌ Critical Pipeline Failure: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Starts your server locally on http://127.0.0.1:5000
    app.run(port=5000, debug=True)