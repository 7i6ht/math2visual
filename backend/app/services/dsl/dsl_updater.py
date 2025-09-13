"""
DSL Updater service for modifying entity types in DSL strings.
"""
import re
from typing import Dict, List, Optional, Tuple
from app.utils.validation_constants import (
    ENTITY_TYPE_MAX_LENGTH,
    ENTITY_TYPE_ALLOWED_CHARS_PATTERN,
    ENTITY_TYPE_CONSECUTIVE_PATTERN
)

class DSLUpdater:
    """Service for updating entity types in DSL strings."""
    
    def __init__(self):
        pass
    
    def update_entity_types(self, dsl: str, old_entity_type: str, new_entity_type: str) -> Tuple[str, int]:
        """
        Update all occurrences of an entity type in a DSL string.
        
        Args:
            dsl: The DSL string to update
            old_entity_type: The entity type to replace
            new_entity_type: The new entity type to use
            
        Returns:
            Tuple of (updated_dsl, number_of_replacements)
        """
        if not dsl or not old_entity_type or not new_entity_type:
            return dsl, 0
        
        # Pattern to match entity_type:value and replace only the value part
        pattern = rf'(entity_type\s*:\s*){re.escape(old_entity_type)}(\b)'
        replacement = rf'\g<1>{new_entity_type}\g<2>'
        
        # Count occurrences and replace in one go
        matches = list(re.finditer(pattern, dsl))
        count = len(matches)
        
        if count == 0:
            return dsl, 0
        
        # Replace all occurrences
        updated_dsl = re.sub(pattern, replacement, dsl)
        
        return updated_dsl, count
    
    
    def validate_entity_type_name(self, entity_type: str) -> Tuple[bool, Optional[str]]:
        """
        Validate entity type name format and uniqueness.
        
        Note: This is a backend safety net validation. Frontend validation should
        be performed first for better user experience.
        
        Args:
            entity_type: The entity type name to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not entity_type:
            return False, "Entity type name cannot be empty"
        
        if len(entity_type) > ENTITY_TYPE_MAX_LENGTH:
            return False, f"Entity type name is too long (max {ENTITY_TYPE_MAX_LENGTH} characters)"
        
        # Check if name contains only allowed characters: letters, dashes, spaces
        if not re.match(ENTITY_TYPE_ALLOWED_CHARS_PATTERN, entity_type):
            return False, "Entity type name can only contain letters, dashes, and spaces"
        
        # Check for consecutive spaces or dashes
        if re.search(ENTITY_TYPE_CONSECUTIVE_PATTERN, entity_type):
            return False, "Entity type name cannot contain consecutive spaces or dashes"
        
        # Check if it starts or ends with space or dash
        if entity_type.startswith((' ', '-')) or entity_type.endswith((' ', '-')):
            return False, "Entity type name cannot start or end with space or dash"
        
        return True, None
