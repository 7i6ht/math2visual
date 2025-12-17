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
    MAX_HISTORY,
)
from app.services.tutor.session_storage import get_session, save_session, delete_session
from flask import Response, stream_with_context
import re

tutor_bp = Blueprint('tutor', __name__)

NEW_MWP_PATTERN = re.compile(r"^\s*NEW_MWP\s*\n?\s*MWP:\s*(.+)\s*$", re.DOTALL)


def _extract_new_mwp(text: str) -> str | None:
    """
    Extract a new math word problem from a NEW_MWP control message.
    Returns the extracted MWP if present, otherwise None.
    """
    if not text:
        return None
    stripped = text.lstrip()
    if not stripped.startswith("NEW_MWP"):
        return None
    match = NEW_MWP_PATTERN.match(stripped)
    if not match:
        return None
    mwp = (match.group(1) or "").strip()
    return mwp or None


def _create_tutor_stream_response(visual_language: str, history: List[Dict[str, str]], language: str, session_id: str = None):
    """
    Helper function to create a streaming response for tutor replies.
    Used by both start/stream and message/stream endpoints.
    """
    def event_stream():
        try:
            visual_request = None

            def _emit_chunk(delta: str):
                payload = {"type": "chunk", "delta": delta}
                return f"data: {json.dumps(payload)}\n\n"

            def _emit_done(final_text: str, visual):
                payload = {
                    "type": "done",
                    "session_id": session_id,
                    "tutor_message": final_text,
                    "visual": visual,
                }
                return f"data: {json.dumps(payload)}\n\n"

            def _finalize_and_persist(final_text: str, vr: dict | None, current_vl: str):
                # Update history with visual request DSL if present
                tutor_entry = {"role": "tutor", "content": final_text}
                if vr:
                    tutor_entry["visual_request"] = vr
                history.append(tutor_entry)

                # Update session if session_id provided
                if session_id:
                    truncated_history = history[-MAX_HISTORY:]
                    save_session(session_id, current_vl, truncated_history)

            def _stream_reply_events(current_vl: str):
                """
                Stream model output and yield SSE chunk events.
                Suppresses NEW_MWP control messages from being sent to the client.

                Returns: (mode, final_text, visual_request)
                  - mode: "normal" | "new_mwp"
                """
                buffered = ""
                mode = None  # None=undecided, "normal", "new_mwp"
                last_visual_request = None

                for chunk in _generate_tutor_reply_stream(current_vl, history, language):
                    if not (isinstance(chunk, dict) and chunk.get("__done__")):
                        delta = chunk or ""
                        if mode is None:
                            buffered += delta
                            stripped = buffered.lstrip()
                            if stripped.startswith("NEW_MWP"):
                                if len(stripped) >= len("NEW_MWP"):
                                    mode = "new_mwp"
                                    continue
                            else:
                                if stripped:
                                    mode = "normal"
                                    yield _emit_chunk(buffered)
                                    buffered = ""
                        else:
                            if mode == "normal":
                                yield _emit_chunk(delta)
                        continue

                    final_text = chunk.get("full_text", "") or ""
                    last_visual_request = chunk.get("visual_request")
                    if mode is None:
                        stripped = final_text.lstrip()
                        mode = "new_mwp" if stripped.startswith("NEW_MWP") else "normal"
                    if mode == "normal" and buffered:
                        yield _emit_chunk(buffered)
                        buffered = ""
                    return mode, final_text, last_visual_request

                # Shouldn't happen, but keep behavior safe
                return "normal", "", last_visual_request

            mode, final_text, visual_request = yield from _stream_reply_events(visual_language)

            if mode == "new_mwp":
                mwp = _extract_new_mwp(final_text)
                if not mwp:
                    cleaned = final_text.replace("NEW_MWP", "", 1).lstrip()
                    _finalize_and_persist(cleaned, visual_request, visual_language)
                    visual = _render_visual_request(visual_request, visual_language, session_id=session_id)
                    yield _emit_done(cleaned, visual)
                    return

                vl_response = generate_visual_language(mwp, None, None, language=language)
                raw = extract_visual_language(vl_response)
                if not raw:
                    err_payload = {"type": "error", "error": _("Did not get Visual Language from AI. Please try again.")}
                    yield f"data: {json.dumps(err_payload)}\n\n"
                    return
                new_dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()

                # Reset conversation history to the new problem (keep session_id stable)
                history.clear()
                history.append({"role": "student", "content": mwp})
                if session_id:
                    delete_session(session_id)
                    save_session(session_id, new_dsl, history[-MAX_HISTORY:])

                new_mode, new_final_text, new_visual_request = yield from _stream_reply_events(new_dsl)
                if new_mode == "new_mwp":
                    err_payload = {"type": "error", "error": _("Could not start a new problem. Please try again.")}
                    yield f"data: {json.dumps(err_payload)}\n\n"
                    return

                _finalize_and_persist(new_final_text, new_visual_request, new_dsl)
                visual = _render_visual_request(new_visual_request, new_dsl, session_id=session_id)
                done_event = json.loads(_emit_done(new_final_text, visual)[6:])
                done_event["visual_language"] = new_dsl
                yield f"data: {json.dumps(done_event)}\n\n"
                return

            _finalize_and_persist(final_text, visual_request, visual_language)
            visual = _render_visual_request(visual_request, visual_language, session_id=session_id)
            yield _emit_done(final_text, visual)
            return
        except Exception as e:
            err_payload = {"type": "error", "error": str(e)}
            yield f"data: {json.dumps(err_payload)}\n\n"
    
    return event_stream


def _render_visual_request(visual_request: dict, fallback_dsl: str, session_id: str = None):
    if not visual_request:
        return None

    # Check if session has a preferred variant (from previous fallback)
    session = get_session(session_id) if session_id else None
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
                # Update session with preferred variant
                visual_language = session.get("visual_language", fallback_dsl)
                history = session.get("history", [])
                save_session(session_id, visual_language, history, metadata={"preferred_variant": fallback_variant})
            
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
        save_session(session_id, empty_dsl, [])
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
        save_session(session_id, empty_dsl, history)
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

    session = get_session(session_id)
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
    history = session.get("history", [])
    save_session(session_id, dsl, history)

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

    session = get_session(session_id)
    if not session:
        return jsonify({"error": _("Session not found or expired.")}), 404

    visual_language = session.get("visual_language", "")
    # Always use language from request header
    language = str(get_locale())
    history: List[Dict[str, str]] = session.get("history", [])

    # Append user message to history before generation
    history.append({"role": "student", "content": user_message})

    event_stream = _create_tutor_stream_response(visual_language, history, language, session_id=session_id)
    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")


