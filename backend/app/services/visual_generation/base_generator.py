"""
Base class for visual generation providing common functionality.
"""
import re
import math
import os
import copy
from abc import ABC, abstractmethod
from typing import Dict, List, Tuple, Any, Optional
from lxml import etree
from collections import defaultdict

from .utils import (
    SVGCache, SVGEmbedder, MathParser, LayoutCalculator, 
    ValidationError, VisualGenerationError
)


class BaseVisualGenerator(ABC):
    """Base class for visual generators with common functionality."""
    
    def __init__(self, resources_path: str):
        self.resources_path = resources_path
        self.svg_cache = SVGCache()
        self.svg_embedder = SVGEmbedder(self.svg_cache)
        self.math_parser = MathParser()
        
        # Default constants - can be overridden by subclasses
        self.constants = {
            "UNIT_SIZE": 40,
            "APPLE_SCALE": 0.75,
            "ITEM_PADDING": 10,
            "BOX_PADDING": 40,
            "OPERATOR_SIZE": 30,
            "MAX_ITEM_DISPLAY": 10,
            "MARGIN": 50
        }
        self.constants["ITEM_SIZE"] = int(self.constants["UNIT_SIZE"] * self.constants["APPLE_SCALE"])
        
        self.layout_calculator = LayoutCalculator(self.constants)
        
        # Component tracking for interactive editing
        self.component_registry = {}  # Track component mappings
        self.dsl_node_counter = 0
    
    def extract_visual_language(self, text: str) -> Optional[str]:
        """Extract the visual_language expression from text."""
        keyword = "visual_language:"
        last_index = text.rfind(keyword)
        
        if last_index != -1:
            return text[last_index:].strip()
        return None
    
    def generate_component_id(self, dsl_path: str, component_type: str) -> str:
        """Generate unique component ID from DSL path."""
        import hashlib
        path_hash = hashlib.md5(dsl_path.encode()).hexdigest()[:8]
        self.dsl_node_counter += 1
        return f"{component_type}_{path_hash}_{self.dsl_node_counter}"
    
    def track_component(self, component_id: str, dsl_path: str, 
                       dsl_range: tuple, properties: dict) -> None:
        """Track component metadata for frontend mapping."""
        self.component_registry[component_id] = {
            'dsl_path': dsl_path,
            'dsl_range': dsl_range,  # (start_char, end_char) in DSL text
            'properties': properties
        }
    
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
        
        def recursive_parse(input_str: str) -> Dict[str, Any]:
            """Recursively parse operations and entities."""
            input_str = " ".join(input_str.strip().split())
            func_pattern = r"(\w+)\s*\((.*)\)"
            match = re.match(func_pattern, input_str)

            if not match:
                raise ValidationError(f"DSL does not match the expected pattern: {input_str}")

            operation, inside = match.groups()
            parsed_entities = []
            result_container = None

            # Process entities
            for entity in split_entities(inside):
                if any(entity.startswith(op) for op in operations_list):
                    parsed_entities.append(recursive_parse(entity))
                else:
                    entity_dict = self._parse_entity(entity)
                    if entity_dict["name"] == "result_container":
                        result_container = entity_dict
                    else:
                        parsed_entities.append(entity_dict)

            result = {"operation": operation, "entities": parsed_entities}
            if result_container:
                result["result_container"] = result_container

            return result
        
        return recursive_parse(dsl_str)
    
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

    def format_dsl_with_ranges(self, dsl_str: str, parsed_data: Dict[str, Any]) -> str:
        """Format DSL and build hierarchical range lookup structure."""
        # Build hierarchical range lookup during formatting
        self.range_lookup = {}
        
        # First, format the DSL cleanly
        formatted_dsl = self._format_dsl_recursive(parsed_data, 0)
        
        # Then, build range lookup by parsing the formatted result
        self._build_range_lookup(formatted_dsl, parsed_data, "")
        
        # Update component registry with precise ranges from lookup
        self._update_component_ranges_from_lookup()
        
        return formatted_dsl
    
    def _format_dsl_recursive(self, node: Dict[str, Any], indent_level: int = 0) -> str:
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
                    child_formatted = self._format_dsl_recursive(entity, indent_level + 1)
                else:
                    # Container entity
                    child_formatted = self._format_container(entity, indent_level + 1)
                children.append(child_formatted)
            
            # Add result container if present
            if node.get('result_container'):
                result_formatted = self._format_container(node['result_container'], indent_level + 1)
                children.append(result_formatted)
            
            # Build the operation
            if not children:
                return f"{indent}{operation}()"
            else:
                children_str = ",\n".join(children)
                return f"{indent}{operation}(\n{children_str}\n{indent})"
        else:
            # This is a container
            return self._format_container(node, indent_level)
    
    def _format_container(self, container: Dict[str, Any], indent_level: int) -> str:
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
    
    def _build_range_lookup(self, formatted_dsl: str, node: Dict[str, Any], parent_path: str) -> None:
        """Build range lookup by analyzing the formatted DSL structure."""
        if node.get('operation'):
            # This is an operation node
            operation = node['operation']
            current_path = f"{parent_path}/{operation}" if parent_path else operation
            
            # Find this operation in the formatted DSL
            operation_pattern = rf"^(\s*){re.escape(operation)}\("
            lines = formatted_dsl.split('\n')
            
            for i, line in enumerate(lines):
                if re.match(operation_pattern, line):
                    # Found the operation start
                    start_pos = sum(len(l) + 1 for l in lines[:i]) + len(line) - len(operation) - 1
                    
                    # Find the matching closing parenthesis
                    paren_count = 0
                    pos = start_pos
                    for char in formatted_dsl[start_pos:]:
                        if char == '(':
                            paren_count += 1
                        elif char == ')':
                            paren_count -= 1
                            if paren_count == 0:
                                end_pos = pos + 1
                                self.range_lookup[current_path] = (start_pos, end_pos)
                                break
                        pos += 1
                    break
            
            # Recursively process children
            for i, entity in enumerate(node.get('entities', [])):
                entity_path = f"{current_path}/entities[{i}]"
                if entity.get('operation'):
                    self._build_range_lookup(formatted_dsl, entity, current_path)
                else:
                    self._find_container_range(formatted_dsl, entity, entity_path)
            
            # Process result container if present
            if node.get('result_container'):
                result_path = f"{current_path}/result_container"
                self._find_container_range(formatted_dsl, node['result_container'], result_path)
        else:
            # This is a container at root level
            self._find_container_range(formatted_dsl, node, parent_path)
    
    def _find_container_range(self, formatted_dsl: str, container: Dict[str, Any], container_path: str) -> None:
        """Find the range of a specific container in the formatted DSL."""
        container_name = container.get('name', 'container')
        
        # Use unique properties to identify the container
        container_name_prop = container.get('container_name')
        entity_quantity = container.get('item', {}).get('entity_quantity') if 'item' in container else container.get('entity_quantity')
        
        if container_name_prop and entity_quantity:
            # Build search pattern for unique identification
            pattern = rf'{re.escape(container_name)}\[[^]]*container_name:\s*{re.escape(str(container_name_prop))}[^]]*entity_quantity:\s*{re.escape(str(entity_quantity))}[^]]*\]'
            match = re.search(pattern, formatted_dsl, re.DOTALL)
            
            if match:
                self.range_lookup[container_path] = (match.start(), match.end())
                return
        
        # Fallback: find by container name pattern (less reliable for duplicates)
        pattern = rf'{re.escape(container_name)}\[[^]]*\]'
        matches = list(re.finditer(pattern, formatted_dsl, re.DOTALL))
        
        if matches:
            # For now, use the first match (could be improved with better heuristics)
            match = matches[0]
            self.range_lookup[container_path] = (match.start(), match.end())
    
    def _update_component_ranges_from_lookup(self) -> None:
        """Update component registry ranges using the precomputed lookup structure."""
        print(f"📊 Range lookup structure contains {len(self.range_lookup)} entries:")
        for path, range_info in self.range_lookup.items():
            print(f"  {path}: {range_info}")
        
        for component_id, component_data in self.component_registry.items():
            dsl_path = component_data['dsl_path']
            old_range = component_data['dsl_range']
            
            # Direct lookup using hierarchical path
            if dsl_path in self.range_lookup:
                new_range = self.range_lookup[dsl_path]
                self.component_registry[component_id]['dsl_range'] = new_range
                print(f"✅ Updated range for {component_id} ({dsl_path}): {old_range} -> {new_range}")
            else:
                print(f"❌ No range found in lookup for {component_id} (path: {dsl_path})")
    
    def parse_dsl_with_ranges(self, dsl_str: str) -> Dict[str, Any]:
        """Enhanced DSL parser that tracks character ranges."""
        operations_list = ["addition", "subtraction", "multiplication", "division", "surplus", "unittrans", "area", "comparison"]
        self.dsl_node_counter = 0  # Reset counter
        
        def split_entities(inside_str: str) -> List[str]:
            """Split the entities inside an operation."""
            entities = []
            current = ""
            bracket_count = 0
            paren_count = 0
            
            for char in inside_str:
                if char == '[':
                    bracket_count += 1
                elif char == ']':
                    bracket_count -= 1
                elif char == '(':
                    paren_count += 1
                elif char == ')':
                    paren_count -= 1
                elif char == ',' and bracket_count == 0 and paren_count == 0:
                    entities.append(current.strip())
                    current = ""
                    continue
                current += char

            if current.strip():
                entities.append(current.strip())

            return entities
        
        def recursive_parse_with_ranges(input_str: str, offset: int = 0, parent_path: str = "") -> Dict[str, Any]:
            """Recursively parse operations and entities with range tracking."""
            input_str = " ".join(input_str.strip().split())
            func_pattern = r"(\w+)\s*\((.*)\)"
            match = re.match(func_pattern, input_str)

            if not match:
                raise ValidationError(f"DSL does not match the expected pattern: {input_str}")

            operation, inside = match.groups()
            start_pos = offset
            end_pos = offset + len(input_str)
            
            # Build full hierarchical path for this operation
            current_operation_path = f"{parent_path}/{operation}" if parent_path else operation
            
            parsed_entities = []
            result_container = None
            current_pos = offset + len(operation) + 1  # +1 for '('

            # Process entities
            for entity in split_entities(inside):
                entity_start = dsl_str.find(entity, current_pos)
                entity_end = entity_start + len(entity)
                
                if any(entity.startswith(op) for op in operations_list):
                    # Recursive operation - pass current path as parent
                    parsed_entity = recursive_parse_with_ranges(entity, entity_start, current_operation_path)
                    parsed_entities.append(parsed_entity)
                else:
                    entity_dict = self._parse_entity(entity)
                    entity_dict['_dsl_range'] = (entity_start, entity_end)
                    # Full hierarchical path including operation ancestry
                    entity_dict['_dsl_path'] = f"{current_operation_path}/entities[{len(parsed_entities)}]"
                    
                    # Track component here during parsing (centralized)
                    component_id = self.generate_component_id(entity_dict['_dsl_path'], entity_dict.get('name', 'entity'))
                    self.track_component(component_id, entity_dict['_dsl_path'], 
                                        entity_dict['_dsl_range'], entity_dict)
                    entity_dict['_component_id'] = component_id
                    
                    if entity_dict["name"] == "result_container":
                        result_container = entity_dict
                    else:
                        parsed_entities.append(entity_dict)
                
                current_pos = entity_end

            result = {
                "operation": operation, 
                "entities": parsed_entities,
                "_dsl_range": (start_pos, end_pos),
                "_dsl_path": current_operation_path
            }
            if result_container:
                result["result_container"] = result_container
            
            self.dsl_node_counter += 1
            return result
        
        return recursive_parse_with_ranges(dsl_str)
    
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
    
    def get_figure_svg_path(self, attr_type: str) -> Optional[str]:
        """Get SVG file path for an attribute type."""
        if attr_type:
            return os.path.join(self.resources_path, f"{attr_type}.svg")
        return None
    
    def create_svg_root(self) -> etree.Element:
        """Create root SVG element."""
        NS = "http://www.w3.org/2000/svg"
        return etree.Element("svg", nsmap={None: NS})
    
    def finalize_svg(self, svg_root: etree.Element, margin: int = None) -> None:
        """Set final SVG dimensions based on content."""
        if margin is None:
            margin = self.constants["MARGIN"]
            
        max_x, max_y = self.svg_embedder.get_max_dimensions()
        final_width = max_x + margin
        final_height = max_y + margin
        
        svg_root.attrib["width"] = str(int(final_width))
        svg_root.attrib["height"] = str(int(final_height))
    
    def embed_top_figures_and_text(self, parent: etree.Element, box_x: float, box_y: float, 
                                  box_width: float, container_type: str, container_name: str, 
                                  attr_type: str, attr_name: str) -> None:
        """Embed figures and text at the top of a container."""
        items = []
        show_something = container_name or container_type or attr_name or attr_type
        
        if not show_something:
            items.append(("text", ""))
        else:
            if container_type:
                figure_path = self.get_figure_svg_path(container_type)
                if figure_path and os.path.exists(figure_path):
                    items.append(("svg", container_type))
            
            if container_name:
                items.append(("text", container_name))
            
            if attr_type and attr_name:
                figure_path = self.get_figure_svg_path(attr_type)
                if figure_path and os.path.exists(figure_path):
                    items.append(("svg", attr_type))
                items.append(("text", attr_name))
        
        # Calculate positions
        item_positions = []
        total_width = 0
        for idx, (t, v) in enumerate(items):
            if t == "svg":
                width = self.constants["UNIT_SIZE"]
            else:
                width = len(v) * 7  # Approximate width per character
            item_positions.append((t, v, width))
            total_width += width
            if idx < len(items) - 1:
                total_width += 10
        
        # Create group and position items
        group = etree.SubElement(parent, "g")
        start_x = box_x + (box_width - total_width) / 2
        center_y = box_y - self.constants["UNIT_SIZE"] - 5
        current_x = start_x
        
        for idx, (t, v, width) in enumerate(item_positions):
            if t == "svg":
                figure_path = self.get_figure_svg_path(v)
                if figure_path and os.path.exists(figure_path):
                    svg_el = self.svg_embedder.embed_svg(
                        figure_path, x=current_x, y=center_y, 
                        width=self.constants["UNIT_SIZE"], height=self.constants["UNIT_SIZE"]
                    )
                    group.append(svg_el)
                current_x += width
            else:
                text_x = current_x
                text_y = center_y + (self.constants["UNIT_SIZE"] / 2)
                text_element = etree.SubElement(
                    group, "text", x=str(text_x), y=str(text_y),
                    style="font-size: 15px; pointer-events: none;", dominant_baseline="middle", text_anchor="middle"
                )
                text_element.text = v
                current_x += width
            
            if idx < len(items) - 1:
                current_x += 10
    
    @abstractmethod
    def render_svgs_from_data(self, output_file: str, data: Dict[str, Any]) -> bool:
        """Abstract method for rendering SVGs from data. Must be implemented by subclasses."""
        pass
    
    def get_missing_entities(self) -> List[str]:
        """Get list of missing SVG entities."""
        return self.svg_embedder.get_missing_entities()
    
    def reset_missing_entities(self) -> None:
        """Reset missing entities tracking."""
        self.svg_embedder.reset_missing_entities()
    
    def save_svg(self, svg_root: etree.Element, output_file: str) -> None:
        """Save SVG to file."""
        with open(output_file, "wb") as f:
            f.write(etree.tostring(svg_root, pretty_print=True))
