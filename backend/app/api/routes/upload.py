"""
Upload API routes for SVG file management.
"""
from flask import Blueprint, request, jsonify
import os

from app.services.validation.svg_validator import SVGValidator, validate_file, generate_file_hash
from app.config.storage_config import get_upload_path

upload_bp = Blueprint('upload', __name__)


@upload_bp.route("/api/upload-svg", methods=["POST"])
def upload_svg():
    """
    Upload SVG file to the svg_dataset directory with enhanced validation and security.
    
    Expects:
        - file: SVG file upload
        - expected_filename: Expected filename for validation
        
    Returns:
        JSON response with success status and validation details
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
        
        # Comprehensive validation using the SVG validator with antivirus scanning
        is_valid, validation_error, validation_details = validate_file(
            file_content, expected_filename, include_antivirus=True
        )
        if not is_valid:
            return jsonify({
                "success": False, 
                "error": validation_error,
                "validation_details": validation_details
            }), 400
        
        # Generate file hash for integrity
        file_hash = generate_file_hash(file_content)
        
        # Secure the filename and prepare directory
        secure_name = SVGValidator.get_secure_filename(expected_filename)
        svg_dataset_dir = get_upload_path()
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
            "validation_details": validation_details
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": f"Upload failed: {str(e)}"}), 500
