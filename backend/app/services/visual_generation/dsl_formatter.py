"""
DSL Formatter for visual generation providing formatting functionality.
"""
import re
from typing import Dict, List, Any, Optional, Tuple


class DSLFormatter:
    """Formatter class for DSL strings with comprehensive formatting functionality."""
    
    def __init__(self):
        # Component tracking for interactive editing - simplified structure
        self.component_registry = {}  # Map dsl_path -> {dsl_path, dsl_range}
    
    def track_component(self, dsl_path: str, dsl_range: tuple, property_value: Optional[Any] = None) -> None:
        """Track component metadata for frontend mapping.

        If the provided DSL path represents a property, an optional
        property_value can be supplied and will be stored for frontend usage.
        """
        entry = {
            'dsl_range': dsl_range  # (start_char, end_char) in DSL text
        }
        if property_value is not None:
            # Store property value as string to simplify frontend handling
            entry['property_value'] = str(property_value)
        self.component_registry[dsl_path] = entry
    
    def format_dsl(self, dsl_str: str) -> str:
        """Format DSL string with proper indentation and line breaks."""
        try:
            return self._format_dsl_recursive(dsl_str.strip(), 0)
        except Exception as e:
            # If formatting fails, return original string
            print(f"DSL formatting failed: {e}")
            return dsl_str
    
    def _format_dsl_recursive(self, dsl_str: str, indent_level: int = 0) -> str:
        """Recursively format DSL with proper indentation."""
        indent = "  " * indent_level
        
        # Check if this is an operation
        operations_list = ["addition", "subtraction", "multiplication", "division", "surplus", "unittrans", "area", "comparison"]
        func_pattern = r"(\w+)\s*\((.*)\)"
        match = re.match(func_pattern, dsl_str.strip(), re.DOTALL)
        
        if match and match.group(1) in operations_list:
            operation, content = match.groups()
            
            # Split content into entities/operations
            entities = self._split_dsl_entities(content)
            
            if not entities:
                return f"{indent}{operation}()"
            
            formatted_children = []
            for entity in entities:
                entity = entity.strip()
                if any(entity.startswith(op + "(") for op in operations_list):
                    # Nested operation
                    formatted_children.append(self._format_dsl_recursive(entity, indent_level + 1))
                else:
                    # Container
                    formatted_children.append(self._format_container(entity, indent_level + 1))
            
            children_str = ",\n".join(formatted_children)
            return f"{indent}{operation}(\n{children_str}\n{indent})"
        else:
            # Not an operation, treat as container
            return self._format_container(dsl_str, indent_level)
    
    def _format_container(self, container_str: str, indent_level: int) -> str:
        """Format a container with proper indentation."""
        indent = "  " * indent_level
        
        container_pattern = r"(\w+)\[(.*?)\]"
        match = re.match(container_pattern, container_str.strip(), re.DOTALL)
        
        if not match:
            return f"{indent}{container_str.strip()}"
        
        container_name, content = match.groups()
        
        if not content.strip():
            return f"{indent}{container_name}[]"
        
        # Parse properties
        properties = []
        parts = content.split(',')
        
        for part in parts:
            part = part.strip()
            if ':' in part:
                key, value = part.split(':', 1)
                properties.append(f"{indent}  {key.strip()}: {value.strip()}")
        
        if not properties:
            return f"{indent}{container_name}[]"
        
        properties_str = ",\n".join(properties)
        return f"{indent}{container_name}[\n{properties_str}\n{indent}]"
    
    def _split_dsl_entities(self, content: str) -> List[str]:
        """Split DSL content into entities, respecting nested structures."""
        entities = []
        current = ""
        bracket_count = 0
        paren_count = 0
        
        for char in content:
            if char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
            elif char == '(':
                paren_count += 1
            elif char == ')':
                paren_count -= 1
            elif char == ',' and bracket_count == 0 and paren_count == 0:
                if current.strip():
                    entities.append(current.strip())
                current = ""
                continue
            
            current += char
        
        if current.strip():
            entities.append(current.strip())
        
        return entities

    def normalize_dsl_to_single_line(self, dsl_str: str) -> str:
        """Normalize formatted DSL to single line for parsing."""
        return (dsl_str
                .replace('\n', ' ')         # Replace newlines with spaces
                .replace('\r', ' ')         # Replace carriage returns
                .replace('\t', ' ')         # Replace tabs
                .replace('  ', ' ')         # Collapse double spaces
                .replace('  ', ' ')         # Collapse remaining double spaces (repeat to handle multiple)
                .replace(' ,', ',')         # Remove space before commas
                .replace(', ', ',')         # Remove space after commas  
                .replace(' [', '[')         # Remove space before brackets
                .replace('[ ', '[')         # Remove space after opening bracket
                .replace(' ]', ']')         # Remove space before closing bracket
                .replace('] ', ']')         # Remove space after closing bracket
                .replace(' (', '(')         # Remove space before parentheses
                .replace('( ', '(')         # Remove space after opening parenthesis
                .replace(' )', ')')         # Remove space before closing parenthesis
                .replace(') ', ')')         # Remove space after closing parenthesis
                .replace(' : ', ':')        # Remove spaces around colons
                .replace(': ', ':')         # Remove space after colon
                .replace(' :', ':')         # Remove space before colon
                .strip())

    def format_with_ranges(self, parsed_dsl: Dict[str, Any]) -> str:
        """Format DSL and calculate ranges for all hierarchical paths."""
        # Clear component registry for new formatting
        self.component_registry = {}
        
        # Format the DSL and compute ranges simultaneously during formatting
        formatted_dsl, _ = self._format_with_ranges_recursive(parsed_dsl, 0, "", 0)
        
        return formatted_dsl
    
    def _format_with_ranges_recursive(self, node: Dict[str, Any], indent_level: int, parent_path: str, current_pos: int) -> Tuple[str, int]:
        """Format DSL while tracking ranges during formatting process.
        
        Returns:
            Tuple[str, int]: (formatted_string, end_position)
        """
        indent = "  " * indent_level
        
        if node.get('operation'):
            # This is an operation node
            operation = node['operation']
            current_path = f"{parent_path}/{operation}" if parent_path else operation
            
            # Start building the operation
            operation_start = f"{indent}{operation}("
            operation_range_start = current_pos + len(indent)  # Position of operation name
            pos = current_pos + len(operation_start)
            
            # Collect all children
            children_parts = []
            children_positions = []
            
            # Process entity children
            for i, entity in enumerate(node.get('entities', [])):
                entity_path = f"{current_path}/entities[{i}]"
                if entity.get('operation'):
                    # Nested operation
                    child_formatted, end_pos = self._format_with_ranges_recursive(entity, indent_level + 1, current_path, pos + 1)  # +1 for newline
                else:
                    # Container entity
                    child_formatted, end_pos = self._format_container_with_ranges(entity, indent_level + 1, entity_path, pos + 1)  # +1 for newline
                
                children_parts.append(child_formatted)
                children_positions.append(end_pos)
                pos = end_pos + 2  # +2 for ",\n"
            
            # Process result container if present
            if node.get('result_container'):
                result_path = f"{current_path}/result_container"
                result_formatted, end_pos = self._format_container_with_ranges(node['result_container'], indent_level + 1, result_path, pos + 1)
                children_parts.append(result_formatted)
                children_positions.append(end_pos)
                pos = end_pos
            
            # Build the complete operation
            if not children_parts:
                formatted = f"{indent}{operation}()"
                operation_range_end = operation_range_start + len(f"{operation}()")
                final_pos = current_pos + len(formatted)
            else:
                children_str = ",\n".join(children_parts)
                formatted = f"{indent}{operation}(\n{children_str}\n{indent})"
                operation_range_end = current_pos + len(formatted) - 1  # -1 for the closing paren position
                final_pos = current_pos + len(formatted)
            
            # Track the operation range
            self.track_component(current_path, (operation_range_start, operation_range_end))
            
            return formatted, final_pos
        else:
            # This is a container (root level)
            return self._format_container_with_ranges(node, indent_level, parent_path, current_pos)
    
    def _format_container_with_ranges(self, container: Dict[str, Any], indent_level: int, container_path: str, current_pos: int) -> Tuple[str, int]:
        """Format a container while tracking ranges during formatting.
        
        Returns:
            Tuple[str, int]: (formatted_string, end_position)
        """
        indent = "  " * indent_level
        container_name = container.get('name', 'container')
        
        # Set the DSL path on the container for SVG generation
        container['_dsl_path'] = container_path
        
        # Container starts at current position + indent
        container_start = current_pos + len(indent)
        
        # Build container opening
        container_opening = f"{indent}{container_name}["
        pos = current_pos + len(container_opening) + 1  # +1 for newline
        
        # Format properties and track their ranges
        properties = []
        property_order = [
            'entity_name', 'entity_type', 'entity_quantity',
            'container_name', 'container_type', 'attr_name', 'attr_type'
        ]
        
        for prop in property_order:
            value = None
            if prop in container:
                value = container[prop]
            elif prop in container.get('item', {}):
                value = container['item'][prop]
            
            if value is not None:
                # Format value properly (remove .0 for integers)
                if isinstance(value, float) and value.is_integer():
                    formatted_value = int(value)
                else:
                    formatted_value = value
                
                # Build property line
                property_line = f"{indent}  {prop}: {formatted_value}"
                properties.append(property_line)
                
                # Calculate property range
                prop_start = pos + len(f"{indent}  ")
                prop_end = prop_start + len(f"{prop}: {formatted_value}")
                
                # Track this property
                property_path = f"{container_path}/{prop}"
                self.track_component(property_path, (prop_start, prop_end), formatted_value)
                print(f"DEBUG: Tracked property {property_path} at range ({prop_start}, {prop_end}) with value '{formatted_value}'")
                
                # Update position for next property
                pos += len(property_line) + 2  # +2 for ",\n"
        
        # Build the complete container
        if not properties:
            formatted = f"{indent}{container_name}[]"
            container_end = container_start + len(f"{container_name}[]")
            final_pos = current_pos + len(formatted)
        else:
            properties_str = ",\n".join(properties)
            formatted = f"{indent}{container_name}[\n{properties_str}\n{indent}]"
            container_end = current_pos + len(formatted) - 1  # -1 for closing bracket position
            final_pos = current_pos + len(formatted)
        
        # Track the container range
        self.track_component(container_path, (container_start, container_end))
        
        return formatted, final_pos
    
    def _format_dsl_recursive_clean(self, node: Dict[str, Any], indent_level: int = 0) -> str:
        """Recursively format DSL nodes with clean logic."""
        indent = "  " * indent_level
        
        if node.get('operation'):
            # This is an operation node
            operation = node['operation']
            
            # Collect all child elements
            children = []
            
            # Add entity children
            for entity in node.get('entities', []):
                if entity.get('operation'):
                    # Nested operation
                    child_formatted = self._format_dsl_recursive_clean(entity, indent_level + 1)
                else:
                    # Container entity
                    child_formatted = self._format_container_clean(entity, indent_level + 1)
                children.append(child_formatted)
            
            # Add result container if present
            if node.get('result_container'):
                result_formatted = self._format_container_clean(node['result_container'], indent_level + 1)
                children.append(result_formatted)
            
            # Build the operation
            if not children:
                return f"{indent}{operation}()"
            else:
                children_str = ",\n".join(children)
                return f"{indent}{operation}(\n{children_str}\n{indent})"
        else:
            # This is a container
            return self._format_container_clean(node, indent_level)
    
    def _format_container_clean(self, container: Dict[str, Any], indent_level: int) -> str:
        """Format a container with proper indentation."""
        indent = "  " * indent_level
        container_name = container.get('name', 'container')
        
        # Format properties
        properties = []
        property_order = [
            'entity_name', 'entity_type', 'entity_quantity',
            'container_name', 'container_type', 'attr_name', 'attr_type'
        ]
        
        for prop in property_order:
            value = None
            if prop in container:
                value = container[prop]
            elif prop in container.get('item', {}):
                value = container['item'][prop]
            
            if value is not None:
                # Format numeric values properly (remove .0 for integers)
                if isinstance(value, float) and value.is_integer():
                    formatted_value = int(value)
                else:
                    formatted_value = value
                properties.append(f"{indent}  {prop}: {formatted_value}")
        
        # Build formatted container
        if not properties:
            return f"{indent}{container_name}[]"
        else:
            properties_str = ",\n".join(properties)
            return f"{indent}{container_name}[\n{properties_str}\n{indent}]"
