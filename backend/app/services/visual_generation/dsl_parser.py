"""
DSL Parser for visual generation providing parsing functionality.
"""
import re
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict

from .utils import ValidationError, MathParser


class DSLParser:
    """Parser class for DSL strings with comprehensive parsing functionality."""
    
    def __init__(self):
        self.math_parser = MathParser()
    
    def extract_visual_language(self, text: str) -> Optional[str]:
        """Extract the visual_language expression from text."""
        keyword = "visual_language:"
        last_index = text.rfind(keyword)
        
        if last_index != -1:
            return text[last_index:].strip()
        return None
    
    def parse_dsl(self, dsl_str: str) -> Dict[str, Any]:
        """Parse DSL string into structured data."""
        operations_list = self.math_parser.OPERATIONS_LIST
        
        def split_entities(inside_str: str) -> List[str]:
            """Safely split entities while balancing parentheses and brackets."""
            entities = []
            balance_paren = 0
            balance_bracket = 0
            buffer = ""

            for char in inside_str:
                if char == "(":
                    balance_paren += 1
                elif char == ")":
                    balance_paren -= 1
                elif char == "[":
                    balance_bracket += 1
                elif char == "]":
                    balance_bracket -= 1

                if char == "," and balance_paren == 0 and balance_bracket == 0:
                    entities.append(buffer.strip())
                    buffer = ""
                else:
                    buffer += char

            if buffer:
                entities.append(buffer.strip())

            return entities
        
        def recursive_parse(input_str: str, current_path: str = "") -> Dict[str, Any]:
            """Recursively parse operations and entities with path tracking."""
            input_str = " ".join(input_str.strip().split())
            func_pattern = r"(\w+)\s*\((.*)\)"
            match = re.match(func_pattern, input_str)

            if not match:
                raise ValidationError(f"DSL does not match the expected pattern: {input_str}")

            operation, inside = match.groups()
            parsed_entities = []
            result_container = None

            # Create operation path
            operation_path = f"{current_path}/operation" if current_path else "operation"

            # Process entities
            for i, entity in enumerate(split_entities(inside)):
                entity_path = f"{operation_path}/entities[{i}]"
                if any(entity.startswith(op) for op in operations_list):
                    parsed_entities.append(recursive_parse(entity, entity_path))
                else:
                    entity_dict = self._parse_entity(entity)
                    # Set the DSL path on the entity
                    entity_dict["_dsl_path"] = entity_path
                    if entity_dict["name"] == "result_container":
                        result_container = entity_dict
                    else:
                        parsed_entities.append(entity_dict)

            result = {"operation": operation, "entities": parsed_entities}
            if result_container:
                # Set the DSL path on the result container
                result_container["_dsl_path"] = f"{operation_path}/result_container"
                result["result_container"] = result_container

            return result
        
        return recursive_parse(dsl_str)
    
    def _parse_entity(self, entity: str) -> Dict[str, Any]:
        """Parse a single entity string into structured data."""
        entity_pattern = r"(\w+)\[(.*?)\]"
        entity_match = re.match(entity_pattern, entity)
        
        if not entity_match:
            raise ValidationError(f"Entity format is incorrect: {entity}")
            
        entity_name, entity_content = entity_match.groups()
        parts = [p.strip() for p in entity_content.split(',')]
        entity_dict = {"name": entity_name, "item": {}}
        
        for part in parts:
            if ':' in part:
                key, val = part.split(':', 1)
                key, val = key.strip(), val.strip()
                if key == "entity_quantity":
                    try:
                        # Try to parse as int first, then float if needed
                        if '.' in val:
                            entity_dict["item"]["entity_quantity"] = float(val)
                        else:
                            entity_dict["item"]["entity_quantity"] = int(val)
                    except ValueError:
                        entity_dict["item"]["entity_quantity"] = 0
                elif key == "entity_type":
                    entity_dict["item"]["entity_type"] = val
                else:
                    entity_dict[key] = val
        
        return entity_dict
    
    def update_container_types_optimized(self, entities: List[Dict[str, Any]], 
                                       result_entities: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Update container types to ensure uniqueness."""
        combined = entities[:]
        if result_entities:
            combined.append(result_entities[-1])
        
        entity_type_to_entities = defaultdict(list)
        for entity in combined:
            entity_type_to_entities[entity['container_type']].append(entity)
        
        for container_type, group in entity_type_to_entities.items():
            name_to_entities = defaultdict(list)
            for entity in group:
                name_to_entities[entity['container_name']].append(entity)
            
            if len(name_to_entities) <= 1:
                continue
            
            modification_index = 1
            for name, ent_group in name_to_entities.items():
                if modification_index == 1:
                    new_entity_type = container_type
                else:
                    new_entity_type = f"{container_type}-{modification_index}"
                
                for entity in ent_group:
                    entity['container_type'] = new_entity_type
                modification_index += 1

        return entities, result_entities
