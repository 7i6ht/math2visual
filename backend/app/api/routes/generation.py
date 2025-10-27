"""
Generation API routes for visual language processing and SVG generation.
"""
from flask import Blueprint, request, jsonify
import os
import shutil
import copy
import uuid
from datetime import datetime

from app.services.language_generation.gpt_generator import generate_visual_language
from app.services.visual_generation.formal_generator import FormalVisualGenerator
from app.services.visual_generation.intuitive_generator import IntuitiveVisualGenerator
from app.services.visual_generation.dsl_parser import DSLParser
from app.config.storage_config import get_svg_dataset_path

# Check if running in debug mode
DEBUG_MODE = os.getenv('FLASK_DEBUG', 'false').lower() in ('true', '1', 'yes', 'on')

generation_bp = Blueprint('generation', __name__)
output_dir = os.path.join(os.path.dirname(__file__), "../../../storage/output")
resources = get_svg_dataset_path()

class ValidationError(Exception):
    """Raised when DSL validation fails."""
    pass

class VisualGenerationError(Exception):
    """Raised when visual generation fails."""
    pass

def extract_visual_language(text):
    """
    Extracts the visual_language expression from the given text.
    It finds the last occurrence of 'visual_language:' and extracts everything after it.
    """
    keyword = "visual_language:"
    last_index = text.rfind(keyword)  # Find the last occurrence of 'visual_language:'

    if last_index != -1:
        return text[last_index:].strip()  # Extract and return everything after the last occurrence
    else:
        return None  # Return None if no match is found

@generation_bp.route("/api/generate", methods=["POST"])
def generate():
    """
    Generate visual representations from math word problems.
    
    Accepts either:
    - mwp: Math word problem text
    - formula: Optional formula  
    - dsl: Direct DSL input (overrides mwp/formula)
    
    Returns JSON with SVG content for both formal and intuitive representations.
    """
    body = request.json or {}
    
    # Parse DSL input
    if "dsl" in body:
        raw_dsl = body["dsl"].strip()
        if not raw_dsl:
            return jsonify({"error": "Empty Visual Language provided."}), 400
        # Strip the prefix if present
        if raw_dsl.lower().startswith("visual_language:"):
            dsl = raw_dsl.split(":", 1)[1].strip()
        else:
            dsl = raw_dsl
    else:
        # Generate DSL from math word problem
        mwp = body.get("mwp", "").strip()
        formula = body.get("formula") or None
        hint = body.get("hint") or None
        if not mwp:
            return jsonify({"error": "Please provide a math word problem (MWP)."}), 400

        # Generate via GPT and extract
        vl_response = generate_visual_language(mwp, formula, hint)
        # Use parser for extraction
        raw = extract_visual_language(vl_response)
        if not raw:
            return jsonify({"error": "Did not get Visual Language from AI. Please try again."}), 500
        dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()
    
    # Generate visualizations using shared method
    # Setup output directory with unique file names for parallel requests
    os.makedirs(output_dir, exist_ok=True)
    request_id = str(uuid.uuid4())
    output_file = os.path.join(output_dir, f"formal_{request_id}.svg")
    intuitive_file = os.path.join(output_dir, f"intuitive_{request_id}.svg")
    
    # Initialize generators and DSL parser
    formal_generator = FormalVisualGenerator()
    intuitive_generator = IntuitiveVisualGenerator()
    dsl_parser = DSLParser()

    # Parse DSL once using the shared parser
    try:
        data_formal = dsl_parser.parse_dsl(dsl)
        # Create deep copy to avoid mutations
        data_intuitive = copy.deepcopy(data_formal)
    except ValueError as e:
        print(f"Visual Language parse error: {e}")
        return jsonify({"error": f"Visual Language parse error."}), 500
    
    
    formal_error = None
    svg_formal = None
    ok_formal = False
    
    try:
        ok_formal = formal_generator.render_svgs_from_data(output_file, resources, data_formal)
        if ok_formal and os.path.exists(output_file):
            with open(output_file, "r") as f1:
                svg_formal = f1.read()
        else:
            formal_error = "Could not generate formal visualization. Maybe retry."
    except (VisualGenerationError, FileNotFoundError) as e:
        formal_error = f"Formal generation error: {str(e)}"
    except Exception as e:
        formal_error = f"Unexpected formal generation error: {str(e)}"
    

    intuitive_error = None
    svg_intuitive = None
    ok_intu = False
    
    try:
        ok_intu = intuitive_generator.render_svgs_from_data(intuitive_file, resources, data_intuitive)
        if ok_intu and os.path.exists(intuitive_file):
            with open(intuitive_file, "r") as f2:
                svg_intuitive = f2.read()
        else:
            intuitive_error = "Could not generate intuitive visualization. Maybe retry."
    except (VisualGenerationError, FileNotFoundError) as e:
        intuitive_error = f"Intuitive generation error: {str(e)}"
    except Exception as e:
        intuitive_error = f"Unexpected intuitive generation error: {str(e)}"

    # Archive timestamped copies (only in debug mode)
    if DEBUG_MODE:
        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        if ok_formal and os.path.exists(output_file):
            shutil.copy(output_file, os.path.join(output_dir, f"formal_{ts}_{request_id}.svg"))
        if ok_intu and os.path.exists(intuitive_file):
            shutil.copy(intuitive_file, os.path.join(output_dir, f"intuitive_{ts}_{request_id}.svg"))

    # Collect missing entities from both generators
    formal_missing_entities = formal_generator.get_missing_entities()
    intuitive_missing_entities = intuitive_generator.get_missing_entities()
    
    # Combine missing entities and remove duplicates while preserving order
    all_missing_entities = list(dict.fromkeys(formal_missing_entities + intuitive_missing_entities))
    
    # Return response immediately - cleanup handled by periodic job
    return jsonify({
        "visual_language": dsl,  # Send formatted DSL instead of raw DSL
        "svg_formal": svg_formal,
        "svg_intuitive": svg_intuitive,
        "formal_error": formal_error,
        "intuitive_error": intuitive_error,
        "missing_svg_entities": all_missing_entities
    })


