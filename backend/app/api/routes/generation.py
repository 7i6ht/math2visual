"""
Generation API routes for visual language processing and SVG generation.
"""
from flask import Blueprint, request, jsonify
import os
import shutil
import copy
from datetime import datetime

from app.services.language_generation.gpt_generator import generate_visual_language
from app.services.visual_generation.formal_generator import FormalVisualGenerator
from app.services.visual_generation.intuitive_generator import IntuitiveVisualGenerator
from app.services.visual_generation.utils import ValidationError, VisualGenerationError
from app.services.dsl.dsl_parser import DSLParser
from app.services.dsl.dsl_updater import DSLUpdater
from app.config.storage_config import get_svg_dataset_path

generation_bp = Blueprint('generation', __name__)


def generate_visualizations(parsed_dsl, output_dir=None):
    """
    Generate formal and intuitive visualizations from parsed DSL.
    
    Args:
        parsed_dsl: Parsed DSL data structure
        output_dir: Optional output directory path
        
    Returns:
        dict: Contains svg_formal, svg_intuitive, formal_error, intuitive_error, 
              and missing_svg_entities
    """
    # Setup output directory
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "../../../storage/output")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "output.svg")
    intuitive_file = os.path.join(output_dir, "intuitive.svg")
    
    # Initialize generators with configurable SVG path
    resources = get_svg_dataset_path()
    formal_generator = FormalVisualGenerator(resources)
    intuitive_generator = IntuitiveVisualGenerator(resources)
    
    # Create a copy for the intuitive generator BEFORE any processing
    intuitive_parsed_dsl = copy.deepcopy(parsed_dsl)
    
    # Generate formal visualization
    if os.path.exists(output_file):
        os.remove(output_file)
    
    formal_error = None
    svg_formal = None
    ok_formal = False
    
    # Reset missing entities tracking
    formal_generator.reset_missing_entities()
    
    try:
        ok_formal = formal_generator.render_svgs_from_data(output_file, parsed_dsl)
        if ok_formal and os.path.exists(output_file):
            with open(output_file, "r") as f1:
                svg_formal = f1.read()
        else:
            formal_error = "Could not generate formal visualization."
    except (VisualGenerationError, FileNotFoundError) as e:
        formal_error = f"Formal generation error: {str(e)}"
    except Exception as e:
        formal_error = f"Unexpected formal generation error: {str(e)}"
    
    # Generate intuitive visualization
    if os.path.exists(intuitive_file):
        os.remove(intuitive_file)
    
    intuitive_error = None
    svg_intuitive = None
    ok_intu = False
    
    # Reset missing entities tracking
    intuitive_generator.reset_missing_entities()
    
    try:
        ok_intu = intuitive_generator.render_svgs_from_data(intuitive_file, intuitive_parsed_dsl)
        if ok_intu and os.path.exists(intuitive_file):
            with open(intuitive_file, "r") as f2:
                svg_intuitive = f2.read()
        else:
            intuitive_error = "Could not generate intuitive visualization."
    except (VisualGenerationError, FileNotFoundError) as e:
        intuitive_error = f"Intuitive generation error: {str(e)}"
    except Exception as e:
        intuitive_error = f"Unexpected intuitive generation error: {str(e)}"

    # Archive timestamped copies
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    if ok_formal and os.path.exists(output_file):
        shutil.copy(output_file, os.path.join(output_dir, f"formal_{ts}.svg"))
    if ok_intu and os.path.exists(intuitive_file):
        shutil.copy(intuitive_file, os.path.join(output_dir, f"intuitive_{ts}.svg"))

    # Collect missing entities from both generators
    formal_missing_entities = formal_generator.get_missing_entities()
    intuitive_missing_entities = intuitive_generator.get_missing_entities()
    
    # Combine missing entities and remove duplicates while preserving order
    all_missing_entities = list(dict.fromkeys(formal_missing_entities + intuitive_missing_entities))
    
    return {
        "svg_formal": svg_formal,
        "svg_intuitive": svg_intuitive,
        "formal_error": formal_error,
        "intuitive_error": intuitive_error,
        "missing_svg_entities": all_missing_entities
    }


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
    
    # Initialize parser
    dsl_parser = DSLParser()
    
    # Parse DSL input
    if "dsl" in body:
        raw_dsl = body["dsl"].strip()
        if not raw_dsl:
            return jsonify({"error": "Empty DSL provided."}), 400
        # Strip the prefix if present
        if raw_dsl.lower().startswith("visual_language:"):
            dsl = raw_dsl.split(":", 1)[1].strip()
        else:
            dsl = raw_dsl
    else:
        # Generate DSL from math word problem
        mwp = body.get("mwp", "").strip()
        formula = body.get("formula") or None
        if not mwp:
            return jsonify({"error": "Please provide a math word problem (mwp)."}), 400

        # Generate via GPT and extract
        vl_response = generate_visual_language(mwp, formula)
        # Use parser for extraction
        raw = dsl_parser.extract_visual_language(vl_response)
        if not raw:
            return jsonify({"error": "Could not find `visual_language:` in GPT response."}), 500
        dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()
    
    # Parse DSL
    try:
        parsed_dsl = dsl_parser.parse_dsl(dsl)
    except (ValueError, ValidationError) as e:
        return jsonify({"error": f"DSL parse error: {e}"}), 500
    
    # Generate visualizations using shared method
    result = generate_visualizations(parsed_dsl)
    
    # Return results with formatted DSL (no component mappings)
    return jsonify({
        "visual_language": dsl,  # Send formatted DSL instead of raw DSL
        "svg_formal": result["svg_formal"],
        "svg_intuitive": result["svg_intuitive"],
        "formal_error": result["formal_error"],
        "intuitive_error": result["intuitive_error"],
        "missing_svg_entities": result["missing_svg_entities"]
    })


@generation_bp.route("/api/update-embedded-svg", methods=["POST"])
def update_embedded_svg():
    """
    Update type in DSL and regenerate visuals.
    
    Expects:
        - dsl: Current DSL string
        - old_svg_name: Current type to replace
        - new_svg_name: New type to use
        
    Returns JSON with updated DSL and regenerated SVG content.
    """
    body = request.json or {}
    
    dsl = body.get("dsl", "").strip()
    old_svg_name = body.get("old_svg_name", "").strip()
    new_svg_name = body.get("new_svg_name", "").strip()
    
    if not dsl:
        return jsonify({"error": "DSL is required"}), 400
    
    if not old_svg_name:
        return jsonify({"error": "old_svg_name is required"}), 400
    
    if not new_svg_name:
        return jsonify({"error": "New type is required"}), 400
    
#    # Initialize DSL updater and validate new type
    dsl_updater = DSLUpdater() # TODO: move validation to upload endpoint
#    is_valid, validation_error = dsl_updater.validate_format(new_svg_name)
#    if not is_valid:
#       return jsonify({"error": f"Invalid type name: {validation_error}"}), 400
    
    # Update the DSL with new type
    updated_dsl, replacement_count = dsl_updater.update_types(dsl, old_svg_name, new_svg_name)
    
    if replacement_count == 0:
        return jsonify({"error": f"Type '{old_svg_name}' not found in DSL"}), 400
    
    # Initialize parser
    dsl_parser = DSLParser()
    
    # Parse updated DSL
    try:
        parsed_dsl = dsl_parser.parse_dsl(updated_dsl)
    except (ValueError, ValidationError) as e:
        return jsonify({"error": f"DSL parse error after update: {e}"}), 500
    
    # Generate visualizations using shared method
    result = generate_visualizations(parsed_dsl)
    
    return jsonify({
        "visual_language": updated_dsl,
        "svg_formal": result["svg_formal"],
        "svg_intuitive": result["svg_intuitive"],
        "formal_error": result["formal_error"],
        "intuitive_error": result["intuitive_error"],
        "missing_svg_entities": result["missing_svg_entities"],
        "old_svg_name": old_svg_name,
        "new_svg_name": new_svg_name
    })
