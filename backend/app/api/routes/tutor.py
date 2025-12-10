import json
from typing import List, Dict
from flask import Blueprint, request, jsonify
from flask_babel import _, get_locale
from app.api.routes.generation import extract_visual_language, _generate_single_svg
from app.services.language_generation.gpt_generator import generate_visual_language
from app.services.tutor.gemini_tutor import (
    start_tutor_session,
    _generate_tutor_reply_stream,
    TUTOR_SESSIONS,
    MAX_HISTORY,
)
from flask import Response, stream_with_context

tutor_bp = Blueprint('tutor', __name__)


def _render_visual_request(visual_request: dict, fallback_dsl: str, session_id: str = None):
    if not visual_request:
        return None

    # Check if session has a preferred variant (from previous fallback)
    session = TUTOR_SESSIONS.get(session_id) if session_id else None
    preferred_variant = session.get("preferred_variant") if session else None
    
    # Use preferred variant if available, otherwise use requested variant
    requested_variant = visual_request.get("variant") or "intuitive"
    variant = preferred_variant if preferred_variant else requested_variant
    
    dsl_scope = (visual_request.get("dsl_scope") or fallback_dsl or "").strip()

    if not dsl_scope:
        return {
            "variant": variant,
            "error": _("Missing DSL scope for visual request."),
        }

    # Try generating with the selected variant (preferred or requested)
    svg_content, error, _, is_parse_error = _generate_single_svg(dsl_scope, variant)
    
    # If generation failed (no SVG and not a parse error), try fallback to the other variant
    if not svg_content and not is_parse_error and error:
        fallback_variant = "intuitive" if variant == "formal" else "formal"
        fallback_svg, fallback_error, _, fallback_is_parse_error = _generate_single_svg(dsl_scope, fallback_variant)
        
        # If fallback succeeded, use it and store as preferred for this session
        if fallback_svg:
            # Remember this fallback variant for future requests in this session
            if session:
                session["preferred_variant"] = fallback_variant
                TUTOR_SESSIONS[session_id] = session
            
            return {
                "variant": fallback_variant,
                "svg": fallback_svg,
                "error": None,
                "is_parse_error": fallback_is_parse_error,
                "dsl_scope": dsl_scope
            }

    return {
        "variant": variant,
        "svg": svg_content,
        "error": error,
        "is_parse_error": is_parse_error,
        "dsl_scope": dsl_scope,
    }


@tutor_bp.route("/api/tutor/start", methods=["POST"])
def tutor_start():
    """
    Start a tutoring session for a math word problem.
    Generates visual language first, then initializes the tutor conversation.
    """
    body = request.json or {}
    mwp = (body.get("mwp") or "").strip()

    if not mwp:
        return jsonify({"error": _("Provide a math word problem (MWP).")}), 400

    language = get_locale()

    # Generate visual language via GPT backend
    vl_response = generate_visual_language(mwp, None, None, language=language)
    raw = extract_visual_language(vl_response)
    if not raw:
        return jsonify({"error": _("Did not get Visual Language from AI. Please try again.")}), 500
    dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()

    session_id, tutor_reply, visual_request = start_tutor_session(mwp, dsl, language=str(language))
    visual = _render_visual_request(visual_request, dsl, session_id=session_id)

    return jsonify({
        "session_id": session_id,
        "tutor_message": tutor_reply,
        "visual_language": dsl,
        "visual": visual
    })


@tutor_bp.route("/api/tutor/message/stream", methods=["POST"])
def tutor_message_stream():
    """
    Stream a tutoring response (text chunks) using SSE-like format.
    JSON body: session_id, message
    """
    body = request.get_json(silent=True) or {}
    session_id = (body.get("session_id") or "").strip()
    user_message = (body.get("message") or "").strip()

    if not session_id:
        return jsonify({"error": _("Missing session id.")}), 400
    if not user_message:
        return jsonify({"error": _("Please provide a message.")}), 400

    session = TUTOR_SESSIONS.get(session_id)
    if not session:
        return jsonify({"error": _("Session not found or expired.")}), 404

    visual_language = session["visual_language"]
    language = session.get("language", "en")
    history: List[Dict[str, str]] = session["history"]

    # Append user message to history before generation
    history.append({"role": "student", "content": user_message})

    def event_stream():
        try:
            for chunk in _generate_tutor_reply_stream(visual_language, history, language):
                if isinstance(chunk, dict) and chunk.get("__done__"):
                    final_text = chunk.get("full_text", "")
                    visual_request = chunk.get("visual_request")
                    # Update history with visual request DSL if present
                    tutor_entry = {"role": "tutor", "content": final_text}
                    if visual_request:
                        tutor_entry["visual_request"] = visual_request
                    history.append(tutor_entry)
                    session["history"] = history[-MAX_HISTORY:]
                    # Render visual if requested
                    visual = _render_visual_request(visual_request, visual_language, session_id=session_id)
                    payload = {
                        "type": "done",
                        "session_id": session_id,
                        "tutor_message": final_text,
                        "visual": visual
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                else:
                    payload = {
                        "type": "chunk",
                        "delta": chunk
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
        except Exception as e:
            err_payload = {"type": "error", "error": str(e)}
            yield f"data: {json.dumps(err_payload)}\n\n"

    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")


