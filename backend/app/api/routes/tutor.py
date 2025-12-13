import json
import uuid
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


def _create_tutor_stream_response(visual_language: str, history: List[Dict[str, str]], language: str, session_id: str = None):
    """
    Helper function to create a streaming response for tutor replies.
    Used by both start/stream and message/stream endpoints.
    """
    def event_stream():
        try:
            visual_request = None
            for chunk in _generate_tutor_reply_stream(visual_language, history, language):
                if isinstance(chunk, dict) and chunk.get("__done__"):
                    final_text = chunk.get("full_text", "")
                    visual_request = chunk.get("visual_request")
                    # Update history with visual request DSL if present
                    tutor_entry = {"role": "tutor", "content": final_text}
                    if visual_request:
                        tutor_entry["visual_request"] = visual_request
                    history.append(tutor_entry)
                    
                    # Update session if session_id provided
                    if session_id:
                        session = TUTOR_SESSIONS.get(session_id)
                        if session:
                            session["history"] = history[-MAX_HISTORY:]
                        else:
                            TUTOR_SESSIONS[session_id] = {
                                "history": history,
                                "visual_language": visual_language,
                            }
                    
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
    
    return event_stream


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
    If MWP is provided, generates visual language first, then initializes the tutor conversation.
    If MWP is null/empty, creates a session without DSL generation (for autostart).
    """
    body = request.json or {}
    mwp = (body.get("mwp") or "").strip()
    language = get_locale()

    # If no MWP provided, create session without DSL (autostart mode)
    if not mwp:
        session_id = str(uuid.uuid4())
        empty_dsl = ""
        # Create session with empty history and empty visual_language
        TUTOR_SESSIONS[session_id] = {
            "history": [],
            "visual_language": empty_dsl,
        }
        return jsonify({
            "session_id": session_id,
            "tutor_message": "",
            "visual_language": empty_dsl,
            "visual": None
        })

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


@tutor_bp.route("/api/tutor/start/stream", methods=["POST"])
def tutor_start_stream():
    """
    Start a tutoring session with streaming tutor response.
    If MWP is provided, generates visual language first, then streams the tutor conversation.
    If MWP is null/empty, creates a session without DSL generation (for autostart).
    """
    body = request.json or {}
    mwp = (body.get("mwp") or "").strip()
    language = get_locale()

    # If no MWP provided, create session without DSL (autostart mode)
    if not mwp:
        session_id = str(uuid.uuid4())
        empty_dsl = ""
        history: List[Dict[str, str]] = []
        TUTOR_SESSIONS[session_id] = {
            "history": history,
            "visual_language": empty_dsl,
        }
        # Return empty response for autostart
        def empty_stream():
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'tutor_message': '', 'visual_language': empty_dsl, 'visual': None})}\n\n"
        return Response(stream_with_context(empty_stream()), mimetype="text/event-stream")

    # Generate visual language via GPT backend
    vl_response = generate_visual_language(mwp, None, None, language=language)
    raw = extract_visual_language(vl_response)
    if not raw:
        return jsonify({"error": _("Did not get Visual Language from AI. Please try again.")}), 500
    dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()

    # Create session and get initial history
    session_id = str(uuid.uuid4())
    history: List[Dict[str, str]] = [{"role": "student", "content": mwp}]
    
    event_stream = _create_tutor_stream_response(dsl, history, str(language), session_id=session_id)
    
    # Add visual_language to done payload for start endpoint
    original_stream = event_stream
    def enhanced_stream():
        for event in original_stream():
            if event.startswith("data: "):
                try:
                    payload = json.loads(event[6:])
                    if payload.get("type") == "done":
                        payload["visual_language"] = dsl
                        yield f"data: {json.dumps(payload)}\n\n"
                        continue
                except:
                    pass
            yield event
    
    return Response(stream_with_context(enhanced_stream()), mimetype="text/event-stream")


@tutor_bp.route("/api/tutor/generate-dsl", methods=["POST"])
def tutor_generate_dsl():
    """
    Generate DSL for an existing session based on a message (typically the MWP).
    Updates the session's visual_language.
    """
    body = request.json or {}
    session_id = (body.get("session_id") or "").strip()
    mwp = (body.get("mwp") or "").strip()

    if not session_id:
        return jsonify({"error": _("Missing session id.")}), 400
    if not mwp:
        return jsonify({"error": _("Provide a math word problem (MWP).")}), 400

    session = TUTOR_SESSIONS.get(session_id)
    if not session:
        return jsonify({"error": _("Session not found or expired.")}), 404

    # Always use language from request header
    language = str(get_locale())

    # Generate visual language via GPT backend
    vl_response = generate_visual_language(mwp, None, None, language=language)
    raw = extract_visual_language(vl_response)
    if not raw:
        return jsonify({"error": _("Did not get Visual Language from AI. Please try again.")}), 500
    dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()

    # Update session with new visual_language
    session["visual_language"] = dsl

    return jsonify({
        "session_id": session_id,
        "visual_language": dsl
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
    # Always use language from request header
    language = str(get_locale())
    history: List[Dict[str, str]] = session["history"]

    # Append user message to history before generation
    history.append({"role": "student", "content": user_message})

    event_stream = _create_tutor_stream_response(visual_language, history, language, session_id=session_id)
    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")


