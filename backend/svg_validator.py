"""
SVG File Validation and Security Module

This module provides comprehensive validation and security checking for SVG files,
including content analysis, filename validation, and file integrity verification.
"""

import re
import hashlib
import magic
from typing import Optional, Tuple
from werkzeug.utils import secure_filename


class SVGValidationError(Exception):
    """Custom exception for SVG validation errors."""
    pass


class SVGValidator:
    """
    Comprehensive SVG file validator with security-focused content analysis.
    """
    
    # Maximum file sizes
    MAX_RAW_FILE_SIZE = 5 * 1024 * 1024  # 5MB for raw content
    MAX_DECODED_FILE_SIZE = 10 * 1024 * 1024  # 10MB for decoded content
    MAX_FILENAME_LENGTH = 255
    
    # Dangerous content patterns for SVG security
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>',           # Script tags
        r'javascript:',             # JavaScript URLs
        r'data:text/html',          # HTML data URLs
        r'data:application/',       # Application data URLs
        r'<iframe[^>]*>',          # Iframe tags
        r'<object[^>]*>',          # Object tags
        r'<embed[^>]*>',           # Embed tags
        r'<link[^>]*>',            # Link tags
        r'<meta[^>]*>',            # Meta tags
        r'<base[^>]*>',            # Base tags
        r'<form[^>]*>',            # Form tags
        r'on\w+\s*=',              # Event handlers (onclick, onload, etc.)
        r'<!\[CDATA\[.*?\]\]>',    # CDATA sections
        r'<style[^>]*>.*?</style>', # Style tags with potential CSS injection
        r'@import\s+',             # CSS imports
        r'expression\s*\(',        # CSS expressions
        r'url\s*\(\s*["\']?\s*javascript:', # CSS JavaScript URLs
    ]
    
    @classmethod
    def validate_filename(cls, filename: str) -> Tuple[bool, Optional[str]]:
        """
        Validate filename for security and format compliance.
        
        Args:
            filename: The filename to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not filename:
            return False, "Filename cannot be empty"
            
        if len(filename) > cls.MAX_FILENAME_LENGTH:
            return False, f"Filename too long (max {cls.MAX_FILENAME_LENGTH} characters)"
        
        # Allow only safe characters
        safe_pattern = re.compile(r'^[a-zA-Z0-9._-]+$')
        if not safe_pattern.match(filename):
            return False, "Filename contains invalid characters. Only alphanumeric characters, dots, dashes, and underscores are allowed"
        
        # Prevent path traversal
        if '..' in filename or filename.startswith('.'):
            return False, "Filename cannot contain path traversal sequences"
            
        # Must end with .svg
        if not filename.lower().endswith('.svg'):
            return False, "File must have .svg extension"
            
        return True, None
    
    @classmethod
    def validate_file_size(cls, content: bytes) -> Tuple[bool, Optional[str]]:
        """
        Validate file size constraints.
        
        Args:
            content: File content as bytes
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if len(content) == 0:
            return False, "File is empty"
            
        if len(content) > cls.MAX_RAW_FILE_SIZE:
            return False, f"File too large (max {cls.MAX_RAW_FILE_SIZE // (1024*1024)}MB)"
            
        return True, None
    
    @classmethod
    def validate_file_type(cls, content: bytes) -> Tuple[bool, Optional[str]]:
        """
        Validate file type using python-magic.
        
        Args:
            content: File content as bytes
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            file_type = magic.from_buffer(content, mime=True)
            if not file_type.startswith('image/svg') and not file_type.startswith('text/'):
                return False, f"Invalid file type '{file_type}'. Must be SVG"
        except Exception as e:
            # If magic detection fails, we'll rely on content validation
            # This is not a hard failure
            pass
            
        return True, None
    
    @classmethod
    def validate_svg_structure(cls, content_str: str) -> Tuple[bool, Optional[str]]:
        """
        Validate basic SVG structure and XML validity.
        
        Args:
            content_str: File content as string
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Basic SVG structure validation
        if '<svg' not in content_str.lower():
            return False, "File does not contain valid SVG structure"
        
        # Check file size in decoded form
        if len(content_str) > cls.MAX_DECODED_FILE_SIZE:
            return False, f"Decoded file content too large (max {cls.MAX_DECODED_FILE_SIZE // (1024*1024)}MB)"
            
        # Basic XML structure validation
        svg_count = content_str.lower().count('<svg')
        closing_svg_count = content_str.lower().count('</svg>')
        
        if svg_count != closing_svg_count:
            return False, "Invalid SVG structure: mismatched <svg> tags"
            
        return True, None
    
    @classmethod
    def scan_for_malicious_content(cls, content_str: str) -> Tuple[bool, Optional[str]]:
        """
        Scan content for potentially malicious patterns.
        
        Args:
            content_str: File content as string
            
        Returns:
            Tuple of (is_safe, error_message)
        """
        content_lower = content_str.lower()
        
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, content_lower, re.IGNORECASE | re.DOTALL):
                return False, f"File contains potentially malicious content: {pattern}"
        
        # Additional specific checks
        if 'vbscript:' in content_lower:
            return False, "File contains VBScript which is not allowed"
            
        if 'data:image/svg+xml' in content_lower and 'base64' in content_lower:
            return False, "Embedded base64 SVG data URLs are not allowed"
            
        return True, None
    
    @classmethod
    def validate_svg_content(cls, content: bytes) -> Tuple[bool, Optional[str]]:
        """
        Comprehensive SVG content validation.
        
        Args:
            content: File content as bytes
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Convert to string for content analysis
            try:
                content_str = content.decode('utf-8', errors='strict')
            except UnicodeDecodeError:
                return False, "File contains invalid UTF-8 encoding"
            
            # Validate SVG structure
            is_valid, error = cls.validate_svg_structure(content_str)
            if not is_valid:
                return False, error
            
            # Scan for malicious content
            is_safe, error = cls.scan_for_malicious_content(content_str)
            if not is_safe:
                return False, error
                
            return True, None
            
        except Exception as e:
            return False, f"Content validation error: {str(e)}"
    
    @classmethod
    def generate_file_hash(cls, content: bytes) -> str:
        """
        Generate SHA-256 hash of file content for integrity checking.
        
        Args:
            content: File content as bytes
            
        Returns:
            SHA-256 hash as hexadecimal string
        """
        return hashlib.sha256(content).hexdigest()
    
    @classmethod
    def get_secure_filename(cls, filename: str) -> str:
        """
        Get a secure version of the filename.
        
        Args:
            filename: Original filename
            
        Returns:
            Secure filename
        """
        return secure_filename(filename)
    
    @classmethod
    def validate_file_comprehensive(cls, content: bytes, expected_filename: str) -> Tuple[bool, Optional[str]]:
        """
        Perform comprehensive file validation including filename, size, type, and content.
        
        Args:
            content: File content as bytes
            expected_filename: Expected filename
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Validate filename
        is_valid, error = cls.validate_filename(expected_filename)
        if not is_valid:
            return False, f"Filename validation failed: {error}"
        
        # Validate file size
        is_valid, error = cls.validate_file_size(content)
        if not is_valid:
            return False, f"File size validation failed: {error}"
        
        # Validate file type
        is_valid, error = cls.validate_file_type(content)
        if not is_valid:
            return False, f"File type validation failed: {error}"
        
        # Validate SVG content
        is_valid, error = cls.validate_svg_content(content)
        if not is_valid:
            return False, f"Content validation failed: {error}"
        
        return True, None


# Convenience functions for backward compatibility and ease of use
def validate_svg_content(content: bytes) -> Tuple[bool, Optional[str]]:
    """Convenience function for SVG content validation."""
    return SVGValidator.validate_svg_content(content)


def generate_file_hash(content: bytes) -> str:
    """Convenience function for generating file hash."""
    return SVGValidator.generate_file_hash(content)


def is_safe_filename(filename: str) -> bool:
    """Convenience function for filename validation."""
    is_valid, _ = SVGValidator.validate_filename(filename)
    return is_valid


def validate_file_comprehensive(content: bytes, expected_filename: str) -> Tuple[bool, Optional[str]]:
    """Convenience function for comprehensive file validation."""
    return SVGValidator.validate_file_comprehensive(content, expected_filename)