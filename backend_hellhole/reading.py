import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import json

# Load API credentials from environment
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enables frontend connection to this endpoint

# Initialize Wafer Client (Utilizing standard OpenAI bindings)
wafer_client = OpenAI(
    base_url="https://pass.wafer.ai/v1", 
    api_key=os.getenv("WAFER_API_KEY")
)

# ----------------─────────────────────────────
# EDIT 1: DIFFICUTLY RULES LOADER (Mirrors polished_app.py helper)
# ─────────────────────────────────────────────
def difficulty(level: int) -> str:
    """
    Loads the explicit systemic prompt constraints from the local prompts folder
    based on the profile level integer.
    """
    name = {0: "BEGINNER", 1: "INTERMEDIATE", 2: "ADVANCED"}.get(level, "ADVANCED")
    try:
        # For safely reading scripts across all platforms, enforce utf-8 encoding
        with open(f"./prompts/{name}.txt", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        # Fallback in case a file hasn't been created yet
        return f"Target level context ruleset: {name} settings."

# --- REMOVED / COMMENTED OUT OLD MAPPING ---
# LEVEL_MAPPING = {0: "Beginner", 1: "Intermediate", 2: "Advanced"}

@app.route('/generate-reading', methods=['POST'])
def handle_reading_generation():
    try:
        # 1. Grab target settings from front-end payload body
        data = request.json or {}
        user_level_num = data.get('level', 1)  # Defaulting to 1 (Intermediate)
        target_language = data.get('language', 'Arabic')
        user_interests = data.get('interests', 'Daily life, technology, history')
        
        # -------------------------------------------------------------
        # EDIT 2: FETCH PROFILE LABELS AND TEXT CONSTRAINTS
        # -------------------------------------------------------------
        # level_name = LEVEL_MAPPING.get(user_level_num, "Intermediate")
        # print(f"📚 Requesting a {level_name} reading packet in {target_language}...")
        
        level_names = {0: "BEGINNER", 1: "INTERMEDIATE", 2: "ADVANCED"}
        level_name = level_names.get(user_level_num, "INTERMEDIATE")
        diff_rules_text = difficulty(user_level_num)
        
        print(f"📚 Requesting a {level_name} reading packet in {target_language} using loaded rules ruleset...")

        # -------------------------------------------------------------
        # STEP 2: CONSULT WAFER AI FOR GENERATION (TOKEN SAVING MODE)
        # -------------------------------------------------------------
        
        # --- ORIGINAL WAFER API CALL (Commented out to save tokens) ---
        system_instruction = (
            "You are an expert language curriculum specialist. Your task is to generate complete reading comprehension units.\n\n"
            f"=== EXPANDED CRITERIA FOR DIFFICULTY LEVEL: {level_name} ===\n"
            f"{diff_rules_text}\n\n"
            "Always respond with standard JSON formatting containing: 'reading_text', 'multiple_choice' (an array of 3 objects), and 'short_answer' (an array of 2 items)."
        )
        
        prompt = f"""
        Generate a reading compilation in {target_language} adjusted to a {level_name} level profile constraint setup.
        Topic interests: {user_interests}.
        
        Structure requirements:
        1. A reading passage ('reading_text') written completely in the target script.
        2. Exactly 3 Multiple Choice Questions ('multiple_choice') testing comprehension. Each item should have a 'question', an array of options, and an 'answer' index.
        3. Exactly 2 Short Answer Questions ('short_answer') requiring text comprehension synthesis.
        """
        
        wafer_response = wafer_client.chat.completions.create(
            model="Qwen3.5-397B-A17B",
            response_format={"type": "json_object"}, # Forces structured data output from Qwen
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ]
        )
        generated_data = wafer_response.choices[0].message.content

        # --- REPLACEMENT MOCK FILE PARSING (Accommodates multi-script languages via utf-8) ---
        # with open("reading_output.txt", "r", encoding="utf-8") as f:
        #     generated_data = f.read()
        try:
            parsed_json = json.loads(generated_data)
            if "multiple_choice" in parsed_json:
                for mcq in parsed_json["multiple_choice"]:
                    if "correct_answer" in mcq and "answer" not in mcq:
                        mcq["answer"] = mcq["correct_answer"]
            generated_data = parsed_json

        except Exception:
            pass
        print("✅ Structured reading packet generated successfully.")
        
        # Returns the raw text/JSON blueprint block to the frontend UI
        return jsonify({
            "status": "success",
            "data": generated_data
        })

    except Exception as e:
        print(f"❌ Reading Unit Production Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Starts your detached reading system on port 5001 to run side-by-side with app.py on 5000
    app.run(port=5002, debug=True)