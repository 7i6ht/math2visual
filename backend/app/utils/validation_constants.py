"""
Shared validation constants for entity type names.
These should match the frontend validation rules in validation.ts
"""

# Maximum length for entity type names
ENTITY_TYPE_MAX_LENGTH = 100

# Regex pattern for allowed characters (letters, dashes, spaces)
ENTITY_TYPE_ALLOWED_CHARS_PATTERN = r'^[a-zA-Z\-\s]+$'

# Regex pattern to detect consecutive spaces or dashes
ENTITY_TYPE_CONSECUTIVE_PATTERN = r'\s{2,}|-{2,}'
