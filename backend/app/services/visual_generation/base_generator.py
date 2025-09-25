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
from app.services.dsl.dsl_parser import DSLParser


class BaseVisualGenerator(ABC):
    """Base class for visual generators with common functionality."""
    
    def __init__(self, resources_path: str):
        self.resources_path = resources_path
        self.svg_cache = SVGCache()
        self.svg_embedder = SVGEmbedder(self.svg_cache)
        self.math_parser = MathParser()
        
        # Initialize parser
        self.dsl_parser = DSLParser()
        
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
                                  dsl_path: str = "") -> None:
        """Embed figures and text at the top of a container."""
        items = []
        show_something = container_name or container_type
        
        if not show_something:
            items.append(("text", ""))
        else:
            if container_type:
                figure_path = self.get_figure_svg_path(container_type)
                if figure_path and os.path.exists(figure_path):
                    items.append(("svg", container_type))
            
            if container_name:
                items.append(("text", container_name))
        
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
                    
                    # Add DSL path metadata for container_type highlighting
                    if v == container_type:
                        container_type_dsl_path = f"{dsl_path}/container_type"
                        svg_el.set('data-dsl-path', container_type_dsl_path)
                        svg_el.set('style', 'pointer-events: all;')
                    
                    group.append(svg_el)
                current_x += width
            else:
                text_x = current_x
                text_y = center_y + (self.constants["UNIT_SIZE"] / 2)
                text_element = etree.SubElement(
                    group, "text", x=str(text_x), y=str(text_y),
                    style="font-size: 15px; pointer-events: auto;", dominant_baseline="middle", text_anchor="middle"
                )
                text_element.text = v
                
                # Add DSL path metadata for container_name highlighting
                if v == container_name:
                    container_name_dsl_path = f"{dsl_path}/container_name"
                    text_element.set('data-dsl-path', container_name_dsl_path)
                
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
    
    def _handle_unittrans(self, node: Dict[str, Any], entities: List[Dict[str, Any]]) -> None:
        """Handle unit transformation operations."""
        sub_ents = node.get("entities", [])
        if len(sub_ents) == 2:
            main_entity = sub_ents[0]
            unit_entity = sub_ents[1]
            main_entity["unittrans_unit"] = unit_entity["name"]
            main_entity["unittrans_value"] = unit_entity["item"]["entity_quantity"]
            entities.append(main_entity)
    
    def _should_add_brackets(self, parent_op: Optional[str], current_op: str, 
                           container_name: Optional[str], parent_container_name: Optional[str]) -> bool:
        """Determine if brackets should be added based on operator precedence."""
        if parent_op is None:
            return False
            
        parent_priority = self.math_parser.get_priority(parent_op)
        current_priority = self.math_parser.get_priority(current_op)
        
        if parent_priority > current_priority:
            return True
        elif parent_priority == current_priority:
            return not self.math_parser.can_skip_same_precedence(parent_op, current_op)
        
        return False
    
    def _handle_container_name_conflicts(self, entities: List[Dict[str, Any]], 
                                       result_entities: List[Dict[str, Any]]) -> None:
        """Handle container name conflicts between entities and result containers."""
        if result_entities and entities:
            last_container = result_entities[-1].get('container_name')
            if any(e.get('container_name') == last_container for e in entities) and last_container:
                result_entities[-1]['container_name'] = f"{last_container} (result)"
    
    def _draw_unit_transformation_circle(self, svg_root: etree.Element, 
                                       x: float, y: float, unittrans_value: Any) -> None:
        """Draw unit transformation circle."""
        circle_radius = 30
        circle_center_x = x + self.constants["ITEM_SIZE"]/2
        circle_center_y = y - circle_radius
        
        etree.SubElement(svg_root, "circle", cx=str(circle_center_x), cy=str(circle_center_y),
                        r=str(circle_radius), fill="#BBA7F4")
        
        unittrans_text = f"{unittrans_value}"
        text_element = etree.SubElement(svg_root, "text",
                                       x=str(circle_center_x-15), y=str(circle_center_y + 5),
                                       style="font-size: 15px; pointer-events: none;", text_anchor="middle",
                                       dominant_baseline="middle")
        text_element.text = unittrans_text
    
    def _determine_entity_layouts(self, entities: List[Dict[str, Any]]) -> None:
        """Determine layout type for each entity."""
        for e in entities:
            q = e["item"].get("entity_quantity", 0)
            t = e["item"].get("entity_type", "")
            container = e.get("container_type", "")
            # Handle both attr_type and attr_entity_type for compatibility
            attr = e.get("attr_type", "") or e.get("attr_entity_type", "")
            
            if t == "multiplier":
                e["layout"] = "multiplier"
            elif q > self.constants["MAX_ITEM_DISPLAY"] or q % 1 != 0:
                e["layout"] = "large"
            else:
                if "row" in [container, attr]:
                    e["layout"] = "row"
                elif "column" in [container, attr]:
                    e["layout"] = "column"
                else:
                    e["layout"] = "normal"
    
    def _calculate_entity_dimensions(self, entities: List[Dict[str, Any]]) -> None:
        """Calculate dimensions for all entities."""
        # Calculate global layout for normal entities
        normal_entities = [e for e in entities if e["layout"] == "normal"]
        
        if normal_entities:
            largest_normal_q = max(e["item"].get("entity_quantity", 0) for e in normal_entities)
        else:
            largest_normal_q = 1
        
        if largest_normal_q > 0:
            import math
            max_cols = int(math.ceil(math.sqrt(largest_normal_q)))
            max_rows = (largest_normal_q + max_cols - 1) // max_cols
        else:
            max_cols, max_rows = 1, 1
        
        # Assign global dimensions to normal entities
        for e in normal_entities:
            e["cols"] = max_cols
            e["rows"] = max_rows
        
        # Calculate individual dimensions for other layouts
        for e in entities:
            if e["layout"] == "large":
                e["cols"] = 1
                e["rows"] = 1
            elif e["layout"] == "row":
                q = e["item"].get("entity_quantity", 0)
                e["cols"] = q if q > 0 else 1
                e["rows"] = 1
            elif e["layout"] == "column":
                q = e["item"].get("entity_quantity", 0)
                e["cols"] = 1
                e["rows"] = q if q > 0 else 1
            elif e["layout"] == "multiplier":
                e["cols"] = 1
                e["rows"] = 1
        
        # Calculate planned dimensions
        self._calculate_planned_dimensions(entities, max_cols, max_rows)
    
    def _calculate_planned_dimensions(self, entities: List[Dict[str, Any]], 
                                    max_cols: int, max_rows: int) -> None:
        """Calculate planned width and height for each entity."""
        quantities = [e["item"].get("entity_quantity", 0) for e in entities]
        entity_types = [e["item"].get("entity_type", "") for e in entities]
        
        any_multiplier = any(t == "multiplier" for t in entity_types)
        any_above_20 = any(q > self.constants["MAX_ITEM_DISPLAY"] for q in quantities)
        
        # Calculate box dimensions
        normal_box_width = max_cols * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"]) + self.constants["BOX_PADDING"]
        normal_box_height = max_rows * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"]) + self.constants["BOX_PADDING"]
        
        large_total_width = self.constants["ITEM_SIZE"] * 4
        large_box_width = large_total_width + self.constants["BOX_PADDING"]
        large_box_height = self.constants["ITEM_SIZE"] * 4 + self.constants["BOX_PADDING"]
        
        if any_multiplier or any_above_20:
            ref_box_width = max(normal_box_width, large_box_width)
            ref_box_height = max(normal_box_height, large_box_height)
        else:
            ref_box_width = normal_box_width
            ref_box_height = normal_box_height
        
        # Set planned dimensions for each entity
        for e in entities:
            w, h = self.layout_calculator.compute_box_size(
                e, e["layout"], max_cols, max_rows, 
                ref_box_width, ref_box_height, large_box_width, large_box_height
            )
            e["planned_width"] = w
            
            unit_trans_padding = 50 if e.get("unittrans_unit", "") else 0
            e["planned_height"] = h + unit_trans_padding