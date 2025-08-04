from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import shutil
from datetime import datetime
from svg_validator import SVGValidator, validate_file_comprehensive, generate_file_hash
# import your two existing modules
from generate_visual_language_with_gpt import generate_visual_language
from generate_visual_intuitive import (
    extract_visual_language as extract_intuitive,
    parse_dsl            as parse_intuitive,
    render_svgs_from_data as render_intuitive,
)
from generate_visual_formal import (
    extract_visual_language,
    parse_dsl,
    render_svgs_from_data,
)
import generate_visual_formal
import generate_visual_intuitive

app = Flask(__name__)
CORS(app)

def parse_svg_error(error_msg):
    """
    Parse error message to extract missing SVG filename.
    Returns tuple: (is_svg_missing, missing_svg_name)
    """
    if not error_msg:
        return False, None
    
    # Look for the specific missing SVG error pattern
    if "SVG file not found using alternative search:" in error_msg:
        # Extract the file path from the error message
        file_path = error_msg.split("SVG file not found using alternative search:")[1].strip()
        # Extract just the filename from the full path
        missing_svg_name = os.path.basename(file_path)
        return True, missing_svg_name
    
    return False, None



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

    # # 3) Strip off the “visual_language:” prefix
    # #    => we want just “subtraction(container1[…],…)”
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
        raw = extract_visual_language(vl_response)
        if not raw:
            return jsonify({"error": "Could not find `visual_language:` in GPT response."}), 500
        dsl = raw.split(":", 1)[1].strip() if raw.lower().startswith("visual_language:") else raw.strip()
    # parse once for formal…
    try:
        data_formal = parse_dsl(dsl)
    except ValueError as e:
        return jsonify({"error": f"Formal-DSL parse error: {e}"}), 500

    # …and once for intuitive
    try:
        data_intuitive = parse_intuitive(dsl)
    except ValueError as e:
        return jsonify({"error": f"Intuitive-DSL parse error: {e}"}), 500

        # 3) Render the SVGs into your “latest” files
    output_dir    = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    output_file      = os.path.join(output_dir, "output.svg")
    intuitive_file   = os.path.join(output_dir, "intuitive.svg")
    resources        = os.path.join(os.path.dirname(__file__), "svg_dataset")

    # formal
    if os.path.exists(output_file):
        os.remove(output_file)
    
    # Clear error message before generation
    generate_visual_formal.error_message = ""
    ok_formal = render_svgs_from_data(output_file, resources, data_formal)
    
    formal_error = None
    formal_is_svg_missing = False
    formal_missing_svg = None
    
    if ok_formal:
        with open(output_file, "r") as f1:
            svg_formal = f1.read()
    else:
        svg_formal = None
        # Check if it's a missing SVG error
        formal_is_svg_missing, formal_missing_svg = parse_svg_error(generate_visual_formal.error_message)
        if formal_is_svg_missing:
            formal_error = f"Missing SVG file: {formal_missing_svg}"
        else:
            formal_error = "Could not generate formal visualization."
    
    # 3b) Render Intuitive (non-fatal)
    if os.path.exists(intuitive_file):
        os.remove(intuitive_file)
    
    # Clear error message before generation
    generate_visual_intuitive.error_message = ""
    ok_intu = render_intuitive(intuitive_file, resources, data_intuitive)
    
    intuitive_error = None
    intuitive_is_svg_missing = False
    intuitive_missing_svg = None
    
    if ok_intu:
        with open(intuitive_file, "r") as f2:
            svg_intuitive = f2.read()
    else:
        svg_intuitive = None
        # Check if it's a missing SVG error
        intuitive_is_svg_missing, intuitive_missing_svg = parse_svg_error(generate_visual_intuitive.error_message)
        if intuitive_is_svg_missing:
            intuitive_error = f"Missing SVG file: {intuitive_missing_svg}"
        else:
            intuitive_error = "Could not generate intuitive visualization."

    # 4) Archive timestamped copies
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    if ok_formal and os.path.exists(output_file):
        shutil.copy(output_file, os.path.join(output_dir, f"formal_{ts}.svg"))
    if ok_intu and os.path.exists(intuitive_file):
        shutil.copy(intuitive_file, os.path.join(output_dir, f"intuitive_{ts}.svg"))

    # 5) Determine if both failed due to missing SVG
    is_svg_missing = False
    missing_svg_name = None
    
    # Check if both failed due to the same missing SVG
    if (formal_is_svg_missing and intuitive_is_svg_missing and 
        formal_missing_svg == intuitive_missing_svg):
        is_svg_missing = True
        missing_svg_name = formal_missing_svg
    # Or if one failed due to missing SVG and the other succeeded
    elif formal_is_svg_missing and not intuitive_is_svg_missing:
        is_svg_missing = True
        missing_svg_name = formal_missing_svg
    elif intuitive_is_svg_missing and not formal_is_svg_missing:
        is_svg_missing = True
        missing_svg_name = intuitive_missing_svg
    
    # 6) Return the DSL and SVG XML with enhanced error information
    return jsonify({
        "visual_language": dsl,
        "svg_formal": svg_formal,
        "svg_intuitive": svg_intuitive,
        "formal_error": formal_error,
        "intuitive_error": intuitive_error,
        "is_svg_missing": is_svg_missing,
        "missing_svg_name": missing_svg_name
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