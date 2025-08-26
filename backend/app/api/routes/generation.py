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
from app.config.storage_config import get_svg_dataset_path

generation_bp = Blueprint('generation', __name__)


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
            return jsonify({"error": "Empty DSL provided."}), 400
        # Strip the prefix if present
        if raw_dsl.lower().startswith("visual_language:"):
            formatted_dsl_input = raw_dsl.split(":", 1)[1].strip()
        else:
            formatted_dsl_input = raw_dsl
        
        # Normalize formatted DSL to single line for parsing
        temp_generator = FormalVisualGenerator("")
        dsl = temp_generator.normalize_dsl_to_single_line(formatted_dsl_input)
    else:
        # Generate DSL from math word problem
        mwp = body.get("mwp", "").strip()
        formula = body.get("formula") or None
        if not mwp:
            return jsonify({"error": "Please provide a math word problem (mwp)."}), 400

        # Generate via GPT and extract
        vl_response = generate_visual_language(mwp, formula)
        # Use the formal generator for extraction (both have the same method)
        temp_generator = FormalVisualGenerator("")
        raw = temp_generator.extract_visual_language(vl_response)
        if not raw:
            return jsonify({"error": "Could not find `visual_language:` in GPT response."}), 500
        dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()
    
    # Initialize generators with configurable SVG path
    resources = get_svg_dataset_path()
    formal_generator = FormalVisualGenerator(resources)
    intuitive_generator = IntuitiveVisualGenerator(resources)
    
    # Parse DSL once for both generators
    try:
        parsed_data = formal_generator.parse_dsl(dsl)
    except (ValueError, ValidationError) as e:
        return jsonify({"error": f"DSL parse error: {e}"}), 500
    
    # Format DSL and calculate ranges for formal generator
    try:
        formatted_dsl = formal_generator.format_dsl_with_ranges(dsl, parsed_data)
    except Exception as e:
        return jsonify({"error": f"DSL formatting error: {e}"}), 500
    
    # Share component registry with intuitive generator and copy parsed data
    data_formal = parsed_data
    data_intuitive = copy.deepcopy(parsed_data)  # Deep copy to avoid interference
    
    # Copy the component registry from formal to intuitive generator
    intuitive_generator.component_registry = copy.deepcopy(formal_generator.component_registry)

    # Setup output directory using new storage structure
    output_dir = os.path.join(os.path.dirname(__file__), "../../../storage/output")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "output.svg")
    intuitive_file = os.path.join(output_dir, "intuitive.svg")

    # Generate formal visualization
    if os.path.exists(output_file):
        os.remove(output_file)
    
    formal_error = None
    svg_formal = None
    ok_formal = False
    
    # Reset missing entities tracking
    formal_generator.reset_missing_entities()
    
    try:
        ok_formal = formal_generator.render_svgs_from_data(output_file, data_formal)
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
        ok_intu = intuitive_generator.render_svgs_from_data(intuitive_file, data_intuitive)
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
    
    # Return results with component mappings and formatted DSL
    return jsonify({
        "visual_language": formatted_dsl,  # Send formatted DSL instead of raw DSL
        "svg_formal": svg_formal,
        "svg_intuitive": svg_intuitive,
        "formal_error": formal_error,
        "intuitive_error": intuitive_error,
        "missing_svg_entities": all_missing_entities,
        "component_mappings": {
            "formal": formal_generator.component_registry,
            "intuitive": intuitive_generator.component_registry
        }
    })
