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
                        entity_dict["item"]["entity_quantity"] = float(val)
                    except ValueError:
                        entity_dict["item"]["entity_quantity"] = 0.0
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
                    style="font-size: 15px;", dominant_baseline="middle", text_anchor="middle"
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
