from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import shutil
from datetime import datetime
from svg_validator import SVGValidator, validate_file_comprehensive, generate_file_hash
# import your two existing modules
from generate_visual_language_with_gpt import generate_visual_language
from generate_visual_formal import FormalVisualGenerator
from generate_visual_intuitive import IntuitiveVisualGenerator
from visual_generator_utils import ValidationError, VisualGenerationError

app = Flask(__name__)
CORS(app)


@app.route("/api/generate", methods=["POST"])
def generate():
    body = request.json or {}
    # mwp     = body.get("mwp", "").strip()
    # formula = body.get("formula") or None

    # if not mwp:
    #     return jsonify({"error": "Please provide a math word problem (mwp)."}), 400

    # # 1) Ask GPT to produce your DSL
    # vl_response = generate_visual_language(mwp, formula)
    # # vl_response should contain a line like "visual_language: …"
    # raw = extract_visual_language(vl_response)
    # if not raw:
    #     return jsonify({"error": "Could not find `visual_language:` in GPT response."}), 500

    # # 3) Strip off the "visual_language:" prefix
    # #    => we want just "subtraction(container1[…],…)"
    # if raw.lower().startswith("visual_language:"):
    #     dsl = raw.split(":", 1)[1].strip()
    # else:
    #     dsl = raw.strip()
    # if not dsl:
    #     return jsonify({"error": "Could not find `visual_language:` in GPT response."}), 500

    # 2) Parse the DSL into your internal data structure
       # If user supplied a DSL override, use it directly:
    if "dsl" in body:
        raw_dsl = body["dsl"].strip()
        if not raw_dsl:
            return jsonify({"error": "Empty DSL provided."}), 400
        # strip the prefix if present:
        if raw_dsl.lower().startswith("visual_language:"):
            dsl = raw_dsl.split(":", 1)[1].strip()
        else:
            dsl = raw_dsl
    else:
        mwp     = body.get("mwp", "").strip()
        formula = body.get("formula") or None
        if not mwp:
            return jsonify({"error": "Please provide a math word problem (mwp)."}), 400

        # 1) Generate via GPT and extract
        vl_response = generate_visual_language(mwp, formula)
        # Use the formal generator for extraction (both have the same method)
        temp_generator = FormalVisualGenerator("")
        raw = temp_generator.extract_visual_language(vl_response)
        if not raw:
            return jsonify({"error": "Could not find `visual_language:` in GPT response."}), 500
        dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()
    # Initialize generators
    resources = os.path.join(os.path.dirname(__file__), "svg_dataset")
    formal_generator = FormalVisualGenerator(resources)
    intuitive_generator = IntuitiveVisualGenerator(resources)
    
    # parse once for formal…
    try:
        data_formal = formal_generator.parse_dsl(dsl)
    except (ValueError, ValidationError) as e:
        return jsonify({"error": f"Formal-DSL parse error: {e}"}), 500

    # …and once for intuitive
    try:
        data_intuitive = intuitive_generator.parse_dsl(dsl)
    except (ValueError, ValidationError) as e:
        return jsonify({"error": f"Intuitive-DSL parse error: {e}"}), 500

        # 3) Render the SVGs into your "latest" files
    output_dir    = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    output_file      = os.path.join(output_dir, "output.svg")
    intuitive_file   = os.path.join(output_dir, "intuitive.svg")

    # 3a) Render Formal
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
    
    # 3b) Render Intuitive
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

    # 4) Archive timestamped copies
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    if ok_formal and os.path.exists(output_file):
        shutil.copy(output_file, os.path.join(output_dir, f"formal_{ts}.svg"))
    if ok_intu and os.path.exists(intuitive_file):
        shutil.copy(intuitive_file, os.path.join(output_dir, f"intuitive_{ts}.svg"))

    # 5) Collect missing entities from both generators
    formal_missing_entities = formal_generator.get_missing_entities()
    intuitive_missing_entities = intuitive_generator.get_missing_entities()
    
    # Combine missing entities and remove duplicates while preserving order
    all_missing_entities = list(dict.fromkeys(formal_missing_entities + intuitive_missing_entities))
    
    # 6) Return the DSL and SVG XML with enhanced error information
    return jsonify({
        "visual_language": dsl,
        "svg_formal": svg_formal,
        "svg_intuitive": svg_intuitive,
        "formal_error": formal_error,
        "intuitive_error": intuitive_error,
        "missing_svg_entities": all_missing_entities
    })

@app.route("/api/upload-svg", methods=["POST"])
def upload_svg():
    """
    Upload SVG file to the svg_dataset directory with enhanced validation and security.
    Expects: file upload with specific filename and file content
    Returns: success status and any error information
    """
    try:
        # Check request size limit (10MB)
        if request.content_length and request.content_length > 10 * 1024 * 1024:
            return jsonify({"success": False, "error": "Request too large (max 10MB)"}), 413
        
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400
        
        file = request.files['file']
        expected_filename = request.form.get('expected_filename')
        
        if not expected_filename:
            return jsonify({"success": False, "error": "Expected filename not provided"}), 400
        
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        # Read file content for validation
        file_content = file.read()
        file.seek(0)  # Reset file pointer
        
        # Comprehensive validation using the SVG validator
        is_valid, validation_error = validate_file_comprehensive(file_content, expected_filename)
        if not is_valid:
            return jsonify({"success": False, "error": validation_error}), 400
        
        # Generate file hash for integrity
        file_hash = generate_file_hash(file_content)
        
        # Secure the filename and prepare directory
        secure_name = SVGValidator.get_secure_filename(expected_filename)
        svg_dataset_dir = os.path.join(os.path.dirname(__file__), "svg_dataset")
        os.makedirs(svg_dataset_dir, exist_ok=True)
        
        file_path = os.path.join(svg_dataset_dir, secure_name)
        
        # Check if file already exists and compare hashes
        if os.path.exists(file_path):
            try:
                with open(file_path, 'rb') as existing_file:
                    existing_content = existing_file.read()
                    existing_hash = generate_file_hash(existing_content)
                    if existing_hash == file_hash:
                        return jsonify({
                            "success": True, 
                            "message": f"SVG file '{secure_name}' already exists with identical content"
                        })
            except Exception:
                # If we can't read existing file, proceed with overwrite
                pass
        
        # Save the file with atomic write (write to temp file then rename)
        temp_path = file_path + '.tmp'
        try:
            with open(temp_path, 'wb') as f:
                f.write(file_content)
            
            # Atomic move
            if os.path.exists(file_path):
                os.remove(file_path)
            os.rename(temp_path, file_path)
            
        except Exception as e:
            # Clean up temp file if it exists
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
        
        return jsonify({
            "success": True, 
            "message": f"SVG file '{secure_name}' uploaded successfully",
            "file_hash": file_hash[:16]  # Return truncated hash for verification
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": f"Upload failed: {str(e)}"}), 500

if __name__=="__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)