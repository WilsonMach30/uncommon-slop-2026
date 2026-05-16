import anthropic
import os
from dotenv import load_dotenv

load_dotenv()
anthropic_client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

# Wafer via Anthropic-compatible endpoint
wafer_client = anthropic.Anthropic(
    api_key=os.getenv("WAFER_API_KEY"),
    base_url="https://pass.wafer.ai"
)

def probe_model(system_prompt, user_message, provider="anthropic"):
    if provider == "anthropic":
        client = anthropic_client
        model = "claude-sonnet-4-20250514"
    elif provider == "wafer":
        client = wafer_client
        model = "Qwen3.5-397B-A17B"  # or "GLM-5.1"

    response = client.messages.create(
        model=model,
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )
    return response.content[0].text


def compare_models(system_prompt, user_message):
    print("=" * 50)
    print(f"PROMPT: {user_message}")
    print("=" * 50)

    claude = probe_model(system_prompt, user_message, provider="anthropic")
    print(f"CLAUDE:\n{claude}\n")

    wafer = probe_model(system_prompt, user_message, provider="wafer")
    print(f"WAFER (Qwen3.5):\n{wafer}\n")

    return {"claude": claude, "wafer": wafer}


if __name__ == "__main__":
    compare_models(
        system_prompt="You are a helpful assistant.",
        user_message="What year is it and who is the current US president?"
    )