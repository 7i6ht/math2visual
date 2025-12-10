import json
import os
import re
import uuid
import logging
from typing import Dict, List, Optional, Tuple

from dotenv import load_dotenv
import google.generativeai as genai

logger = logging.getLogger(__name__)

load_dotenv(override=True)
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# Default to the latest Pro model; allow override via GEMINI_TUTOR_MODEL
MODEL_NAME = os.environ.get("GEMINI_TUTOR_MODEL", "gemini-pro-latest")

# In-memory store for lightweight tutor sessions
TUTOR_SESSIONS: Dict[str, Dict] = {}


SYSTEM_PROMPT = """
You are Math2Visual's AI tutor. You guide students through math word problems step by step.
- Be encouraging, concise, and ask short check-in questions.
- Do not give the final numeric answer immediately; lead the student through reasoning.
- Use the provided visual_language for grounding, but only reveal parts when helpful.
- When a visual would help, emit exactly one VISUAL_REQUEST JSON (no markdown, no extra text) like:
VISUAL_REQUEST={"variant":"formal"|"intuitive","dsl_scope":"<exact snippet from visual_language>","reason":"<why this helps>"}
Important: If you want to visualize only a single container, you must wrap that snippet in identity(<container[...]>) before sending a VISUAL_REQUEST so it renders correctly.
Keep explanations brief and avoid repeating the full DSL unless needed.
"""
#You are Math2Visual's AI tutor. You guide students through math word problems step by step.
#- Be encouraging, concise, and ask short check-in questions after every chat message by the student.
#- Keep the conversation moving by asking questions guiding the student to find the solution step by step.
#- You are a role model for the student and always polite, kind and patient.
#- Ask for clarification if the student's message is not clear.
#- Do not give the final numeric answer, lead the student through reasoning step by step (asking questions).
#- Use the provided visual_language for grounding and reveal parts of the visual when you have reached a point in the conversation where it is of relevance.
#  A part of the visual is relevant, if the conversation currently is about the quantity of a container or the relationship between two containers.
#  In the quantity case, you either might have previously asked the student what the quantity is or the student has asked you.
#  In that case, you would reveal the corresponding container.
#  If it is a relationship between two containers, you would reveal the corresponding operation with everything it encloses.
#  In your step by step guidance, if the visual language is nested, you go from inside to outside.
#- When a visual is relevant, emit exactly one VISUAL_REQUEST JSON (no markdown, no extra text) like:
#VISUAL_REQUEST={"variant":"formal"|"intuitive","dsl_scope":"<exact, relevant snippet from visual_language>"}
#Do not include any additional fields in the VISUAL_REQUEST. Keep explanations brief and avoid repeating the same snippet.
#Important: If you want to visualize only a single container, you must wrap that snippet in identity(<container[...]>) before sending a VISUAL_REQUEST so it renders correctly.
#"""

VISUAL_REQUEST_PATTERN = re.compile(r"VISUAL_REQUEST\s*=\s*({.*})", re.DOTALL)
MAX_HISTORY = 12  # Keep prompts bounded


def _build_prompt(visual_language: str, history: List[Dict[str, str]], language: str) -> str:
    history_lines = []
    for h in history[-MAX_HISTORY:]:
        role = h['role'].capitalize()
        content = h['content']
        # Include DSL scope from visual request if present
        if h.get('visual_request') and h['visual_request'].get('dsl_scope'):
            dsl_scope = h['visual_request']['dsl_scope']
            history_lines.append(f"{role}: {content}\n[Visual DSL: {dsl_scope}]")
        else:
            history_lines.append(f"{role}: {content}")
    history_text = "\n".join(history_lines)
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Language: {language}\n"
        f"visual_language:\n{visual_language}\n\n"
        "Conversation so far:\n"
        f"{history_text}\n"
        "Tutor:"
    )
    prompt_part = (
        f"Language: {language}\n"
        f"visual_language:\n{visual_language}\n\n"
        "Conversation so far:\n"
        f"{history_text}\n"
        "Tutor:"
    )
    print("------------INPUT---------------")
    print(prompt_part)
    print("--------------------------------")
    return prompt


def _extract_visual_request(text: str) -> Tuple[str, Optional[Dict]]:
    match = VISUAL_REQUEST_PATTERN.search(text)
    if not match:
        return text.strip(), None

    raw_json = match.group(1)
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError:
        logger.warning("Failed to parse VISUAL_REQUEST JSON from tutor response.")
        return VISUAL_REQUEST_PATTERN.sub("", text).strip(), None

    cleaned_text = VISUAL_REQUEST_PATTERN.sub("", text).strip()
    return cleaned_text, parsed


def _generate_tutor_reply(visual_language: str, history: List[Dict[str, str]], language: str) -> Tuple[str, Optional[Dict]]:
    model = genai.GenerativeModel(MODEL_NAME)
    prompt = _build_prompt(visual_language, history, language)

    response = model.generate_content(prompt)
    content = (response.text or "").strip()

    return _extract_visual_request(content)


def _generate_tutor_reply_stream(visual_language: str, history: List[Dict[str, str]], language: str):
    """
    Stream tutor reply as chunks. Yields text deltas, returns (full_text, visual_request) at the end.
    """
    model = genai.GenerativeModel(MODEL_NAME)
    prompt = _build_prompt(visual_language, history, language)
    stream = model.generate_content(prompt, stream=True)

    parts_accum: List[str] = []
    for chunk in stream:
        # Gemini streaming emits candidates with parts; accumulate only text parts
        if not chunk or not getattr(chunk, "candidates", None):
            continue
        for candidate in chunk.candidates:
            content = getattr(candidate, "content", None)
            part_list = getattr(content, "parts", []) or []
            for part in part_list:
                text = getattr(part, "text", "") or ""
                if text:
                    yield text
                    parts_accum.append(text)

    full_text = "".join(parts_accum)
    print("----------OUTPUT----------------")
    print(full_text)
    print("--------------------------------")
    final_text, visual_request = _extract_visual_request(full_text)
    yield {"__done__": True, "full_text": final_text, "visual_request": visual_request}


def start_tutor_session(mwp: str, visual_language: str, language: str = "en") -> Tuple[str, str, Optional[Dict]]:
    session_id = str(uuid.uuid4())
    history: List[Dict[str, str]] = [{"role": "student", "content": mwp}]

    tutor_reply, visual_request = _generate_tutor_reply(visual_language, history, language)
    tutor_entry = {"role": "tutor", "content": tutor_reply}
    if visual_request:
        tutor_entry["visual_request"] = visual_request
    history.append(tutor_entry)

    TUTOR_SESSIONS[session_id] = {
        "history": history,
        "visual_language": visual_language,
        "language": language,
    }

    return session_id, tutor_reply, visual_request


