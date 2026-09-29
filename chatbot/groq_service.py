import os
import json
from django.conf import settings
from groq import Groq

# Initialize Groq client
client = Groq(api_key=getattr(settings, "GROQ_API_KEY", os.environ.get("GROQ_API_KEY", "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")))
MODEL_NAME = getattr(settings, "GROQ_MODEL", "qwen/qwen3.8-27b")

SYSTEM_PROMPT = """
You are MediCare Pharmacy Assistant, an intelligent, compassionate, and safety-focused digital pharmacy assistant.

Your core responsibilities:
- Answer general questions about medicines, common symptoms, dosage principles, side effects, drug interactions, and pharmacy-related topics.
- Explain medical and pharmacological concepts in clear, easy-to-understand language.
- Ask polite clarifying questions when the user's inquiry lacks critical details (e.g., patient age, pregnancy status, other medications taken, symptom duration).
- Never pretend to be a doctor or licensed practitioner.
- Never make a definitive diagnosis.
- Never prescribe prescription medications.
- Never advise stopping or altering prescription medication without consulting the prescribing doctor or a licensed pharmacist.
- Exercise maximum caution for high-risk individuals: infants/children, pregnant or breastfeeding women, elderly patients, chronic disease sufferers (kidney, liver, heart), and patients with known drug allergies.
- If symptoms suggest an emergency, clearly alert the user to seek IMMEDIATE emergency medical assistance (Call 911 / 999 / local emergency number).
- For medication dosage inquiries, explain that exact dosage depends on factors including age, weight, medical history, formulation, and concurrent medications. Direct the user to package labels and professional healthcare providers.
- Maintain a warm, empathetic, and professional tone.

Emergency situations requiring immediate medical attention include:
- Severe chest pain, pressure, or tightness
- Severe shortness of breath or choking
- Sudden numbness, weakness, or facial drooping (stroke signs)
- Sudden loss of consciousness or confusion
- Severe allergic reaction (swelling of throat/lips, hives, anaphylaxis)
- Heavy uncontrolled bleeding
- Accidental poisoning, chemical exposure, or medication overdose

Response formatting:
- Use clean Markdown formatting with bold headers, bullet lists, and highlight boxes where appropriate.
- When an emergency keyword is detected, prominently display an **EMERGENCY WARNING** at the top.
- Keep answers concise, factual, and easy to read.
- End with a gentle reminder to verify with a licensed pharmacist or healthcare provider.
"""

def stream_pharmacy_response(user_message, conversation_history=None):
    """
    Yields Server-Sent Events (SSE) data chunks as the model streams tokens.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if conversation_history and isinstance(conversation_history, list):
        for msg in conversation_history:
            if isinstance(msg, dict) and msg.get("role") in ["user", "assistant"] and msg.get("content"):
                messages.append({
                    "role": msg["role"],
                    "content": str(msg["content"])
                })

    messages.append({
        "role": "user",
        "content": user_message
    })

    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.3,
            max_completion_tokens=2048,
            top_p=1,
            reasoning_effort="medium",
            stream=True
        )

        for chunk in completion:
            delta_content = chunk.choices[0].delta.content or ""
            if delta_content:
                payload = json.dumps({"chunk": delta_content})
                yield f"data: {payload}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

    except Exception as e:
        error_payload = json.dumps({"error": str(e)})
        yield f"data: {error_payload}\n\n"


def get_pharmacy_response_sync(user_message, conversation_history=None):
    """
    Returns complete text response synchronously.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if conversation_history and isinstance(conversation_history, list):
        for msg in conversation_history:
            if isinstance(msg, dict) and msg.get("role") in ["user", "assistant"] and msg.get("content"):
                messages.append({
                    "role": msg["role"],
                    "content": str(msg["content"])
                })

    messages.append({
        "role": "user",
        "content": user_message
    })

    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.3,
            max_completion_tokens=2048,
            top_p=1,
            reasoning_effort="medium",
            stream=False
        )
        return completion.choices[0].message.content or ""
    except Exception as e:
        return f"Service Error: {str(e)}"
