from flask import Blueprint, request, jsonify
from flask_babel import _, get_locale
from app.api.routes.generation import extract_visual_language, _generate_single_svg
from app.services.language_generation.gpt_generator import generate_visual_language
from app.services.tutor.gemini_tutor import start_tutor_session, continue_tutor_session

tutor_bp = Blueprint('tutor', __name__)


def _render_visual_request(visual_request: dict, fallback_dsl: str):
    if not visual_request:
        return None

    variant = visual_request.get("variant") or "intuitive"
    dsl_scope = (visual_request.get("dsl_scope") or fallback_dsl or "").strip()
    reason = visual_request.get("reason")

    if not dsl_scope:
        return {
            "variant": variant,
            "error": _("Missing DSL scope for visual request."),
            "reason": reason
        }

    svg_content, error, missing_entities, is_parse_error = _generate_single_svg(dsl_scope, variant)

    return {
        "variant": variant,
        "svg": svg_content,
        "error": error,
        "missing_svg_entities": missing_entities,
        "is_parse_error": is_parse_error,
        "reason": reason,
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
    formula = body.get("formula") or None
    hint = body.get("hint") or None

    if not mwp:
        return jsonify({"error": _("Please provide a math word problem (MWP).")}), 400

    language = get_locale()

    # Generate visual language via GPT backend
    vl_response = generate_visual_language(mwp, formula, hint, language=language)
    raw = extract_visual_language(vl_response)
    if not raw:
        return jsonify({"error": _("Did not get Visual Language from AI. Please try again.")}), 500
    dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()

    session_id, tutor_reply, visual_request = start_tutor_session(mwp, dsl, language=str(language))
    visual = _render_visual_request(visual_request, dsl)

    return jsonify({
        "session_id": session_id,
        "tutor_message": tutor_reply,
        "visual_language": dsl,
        "visual": visual
    })


@tutor_bp.route("/api/tutor/message", methods=["POST"])
def tutor_message():
    """
    Continue a tutoring session.
    """
    body = request.json or {}
    session_id = body.get("session_id")
    user_message = (body.get("message") or "").strip()

    if not session_id:
        return jsonify({"error": _("Missing session id.")}), 400
    if not user_message:
        return jsonify({"error": _("Please provide a message.")}), 400

    response = continue_tutor_session(session_id, user_message)
    if not response or not response[0]:
        return jsonify({"error": _("Session not found or expired.")}), 404

    _, tutor_reply, visual_request = response

    # Fetch DSL from session for rendering when needed
    from app.services.tutor.gemini_tutor import TUTOR_SESSIONS
    session = TUTOR_SESSIONS.get(session_id)
    dsl = session["visual_language"] if session else ""

    visual = _render_visual_request(visual_request, dsl)

    return jsonify({
        "session_id": session_id,
        "tutor_message": tutor_reply,
        "visual": visual
    })


