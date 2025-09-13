"""
SVG Dataset API routes for fetching, searching, and uploading SVG files.
"""
import os
import re
from flask import Blueprint, request, jsonify
from typing import List, Dict, Optional

from app.config.storage_config import get_svg_dataset_path
from app.services.validation.svg_validator import validate_file
from werkzeug.utils import secure_filename

svg_dataset_bp = Blueprint('svg_dataset', __name__)


@svg_dataset_bp.route("/api/svg-dataset/search", methods=["GET"])
def search_svg_files():
    """
    Search SVG files in the dataset by name.
    
    Query parameters:
        - query: Search string to match against SVG filenames (without extension)
        - limit: Maximum number of results (default: 10)
        
    Returns:
        JSON response with matching SVG files and their preview URLs
    """
    try:
        query = request.args.get('query', '').strip().lower()
        limit = int(request.args.get('limit', 10))
        
        if limit > 50:  # Safety limit
            limit = 50
            
        svg_dataset_dir = get_svg_dataset_path()
        
        if not os.path.exists(svg_dataset_dir):
            print("SVG dataset directory not found\n");
            return jsonify({"error": "SVG dataset directory not found"}), 404
        
        # Get all SVG files
        try:
            svg_files = [
                {
                    'filename': filename,
                    'name': filename[:-4],  # Remove .svg extension
                    'path': os.path.join(svg_dataset_dir, filename)
                }
                for filename in os.listdir(svg_dataset_dir)
                if filename.lower().endswith('.svg')
            ]
        except PermissionError:
            print("Permission denied accessing SVG dataset\n");
            return jsonify({"error": "Permission denied accessing SVG dataset"}), 403
        
        # If no query, return all files up to limit
        if not query:
            return jsonify({
                "files": svg_files[:limit]
            })
        
        # Score and sort files by relevance
        scored_files = []
        for file_info in svg_files:
            name = file_info['name'].lower()
            score = _calculate_relevance_score(query, name)
            if score > 0:
                scored_files.append((score, file_info))
        
        # Sort by score (highest first) and take top results
        scored_files.sort(key=lambda x: x[0], reverse=True)
        top_files = [file_info for _, file_info in scored_files[:limit]]
        
        return jsonify({
            "files": top_files,
            "query": query
        })
        
    except Exception as e:
        print("Search failed: {str(e)}\n");
        return jsonify({"error": f"Search failed: {str(e)}"}), 500
        

def _calculate_relevance_score(query: str, filename: str) -> int:
    """
    Calculate relevance score for filename matching.
    
    Higher scores indicate better matches:
    - Exact match: 100
    - Starts with query: 80
    - Contains query: 60
    - Word boundary match: 70
    - Partial word match: 30
    """
    if not query or not filename:
        return 0
    
    # Exact match
    if filename == query:
        return 100
    
    # Starts with query
    if filename.startswith(query):
        return 80
    
    # Word boundary match (query starts a word in filename)
    word_pattern = r'\b' + re.escape(query)
    if re.search(word_pattern, filename):
        return 70
    
    # Contains query
    if query in filename:
        return 60
    
    # Partial word match (query is contained in a word)
    if any(query in word for word in filename.split()):
        return 30
    
    return 0


@svg_dataset_bp.route("/api/svg-dataset/upload", methods=["POST"])
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
        
        # Secure the filename and prepare directory
        secure_name = secure_filename(expected_filename)
        svg_dataset_dir = get_svg_dataset_path()
        os.makedirs(svg_dataset_dir, exist_ok=True)
        
        file_path = os.path.join(svg_dataset_dir, secure_name)
        
        # Check if file already exists
        if os.path.exists(file_path):
            return jsonify({
                "success": False, 
                "error": f"File '{secure_name}' already exists or has been added by another user in the meantime"
            }), 409
        
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


@svg_dataset_bp.route("/api/svg-dataset/check-exists", methods=["GET"])
def check_svg_exists():
    """
    Check if an SVG name already exists in the dataset.
    
    Query parameters:
        - name: SVG name to check (without extension)
        
    Returns:
        JSON response with exists boolean
    """
    try:
        name = request.args.get('name', '').strip()
        
        if not name:
            return jsonify({"error": "Name parameter is required"}), 400
            
        svg_dataset_dir = get_svg_dataset_path()
        
        if not os.path.exists(svg_dataset_dir):
            return jsonify({"error": "SVG dataset directory not found"}), 404
        
        # Check if file exists
        svg_filename = f"{name}.svg"
        svg_path = os.path.join(svg_dataset_dir, svg_filename)
        exists = os.path.exists(svg_path)
        
        return jsonify({
            "exists": exists,
            "name": name
        })
        
    except Exception as e:
        return jsonify({"error": f"Check failed: {str(e)}"}), 500


