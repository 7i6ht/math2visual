"""
Base class for visual generation providing common functionality.
"""
import os
from abc import ABC, abstractmethod
from typing import Dict, List, Tuple, Any, Optional
from lxml import etree
from .utils import (
    SVGCache, SVGEmbedder, MathParser, LayoutCalculator
)
from .dsl_parser import DSLParser
from .dsl_formatter import DSLFormatter


class BaseVisualGenerator(ABC):
    """Base class for visual generators with common functionality."""
    
    def __init__(self, resources_path: str):
        self.resources_path = resources_path
        self.svg_cache = SVGCache()
        self.svg_embedder = SVGEmbedder(self.svg_cache)
        self.math_parser = MathParser()
        
        # Initialize parser and formatter
        self.dsl_parser = DSLParser()
        self.dsl_formatter = DSLFormatter()
        
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
    
    @property
    def component_registry(self) -> Dict[str, Any]:
        """Get the component registry from the formatter."""
        return self.dsl_formatter.component_registry
    
    @component_registry.setter 
    def component_registry(self, value: Dict[str, Any]) -> None:
        """Set the component registry on the formatter."""
        self.dsl_formatter.component_registry = value
    
    
    def update_container_types_optimized(self, entities: List[Dict[str, Any]], 
                                       result_entities: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Update container types to ensure uniqueness."""
        return self.dsl_parser.update_container_types_optimized(entities, result_entities)
    
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
