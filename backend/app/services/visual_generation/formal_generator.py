"""
Refactored formal visual generator without global state dependencies.
"""
import math
import os
from typing import Dict, List, Tuple, Any, Optional
from lxml import etree

from .base_generator import BaseVisualGenerator
from .utils import ValidationError, VisualGenerationError


class FormalVisualGenerator(BaseVisualGenerator):
    """Generates formal visual representations of mathematical problems."""
    
    def __init__(self, resources_path: str):
        super().__init__(resources_path)
    
    def render_svgs_from_data(self, output_file: str, data: Dict[str, Any]) -> bool:
        """Main method to render SVGs from parsed data."""
        svg_root = self.create_svg_root()
        self.svg_embedder.reset_max_dimensions()
        
        try:
            created = False
            
            if data.get('operation') == "comparison":
                created = self._handle_comparison(data, svg_root)
            else:
                created = self._handle_regular_operation(data, svg_root)
            
            if created:
                self.finalize_svg(svg_root)
                self.save_svg(svg_root, output_file)
                return True
            else:
                return False
                
        except Exception as e:
            raise VisualGenerationError(f"Failed to generate visual: {str(e)}")
    
    def _handle_comparison(self, data: Dict[str, Any], svg_root: etree.Element) -> bool:
        """Handle comparison operations."""
        comparison_data = self._extract_operations_and_entities_for_comparison(data)
        (compare1_operations, compare1_entities, compare1_result_entities,
         compare2_operations, compare2_entities, compare2_result_entities) = comparison_data
        
        # Update container types
        compare1_entities, compare1_result_entities = self.update_container_types_optimized(
            compare1_entities, compare1_result_entities)
        compare2_entities, compare2_result_entities = self.update_container_types_optimized(
            compare2_entities, compare2_result_entities)
        
        # Handle container name conflicts
        self._handle_container_name_conflicts(compare1_entities, compare1_result_entities)
        self._handle_container_name_conflicts(compare2_entities, compare2_result_entities)
        
        # Operations are already in the expected format with DSL paths
        
        return self._render_comparison(
            compare1_operations, compare1_entities, compare1_result_entities,
            compare2_operations, compare2_entities, compare2_result_entities,
            svg_root
        )
    
    def _handle_regular_operation(self, data: Dict[str, Any], svg_root: etree.Element) -> bool:
        """Handle regular (non-comparison) operations."""
        operations, entities, result_entities = self._extract_operations_and_entities(data)
        
        # Update container types and handle conflicts
        entities, result_entities = self.update_container_types_optimized(entities, result_entities)
        self._handle_container_name_conflicts(entities, result_entities)
        # Operations are already in the expected format with DSL paths
        
        return self._render_regular_operation(operations, entities, svg_root, result_entities)
    
    def _extract_operations_and_entities(self, node: Dict[str, Any], 
                                       operations: Optional[List[Dict[str, Any]]] = None,
                                       entities: Optional[List[Dict[str, Any]]] = None,
                                       result_entities: Optional[List[Dict[str, Any]]] = None,
                                       parent_op: Optional[str] = None,
                                       parent_container_name: Optional[str] = None,
                                       current_path: str = "") -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract operations and entities from parsed data structure."""
        if operations is None:
            operations = []
        if entities is None:
            entities = []
        if result_entities is None:
            result_entities = []

        op = node.get("operation", "")

        # Handle special operations
        if op == "unittrans":
            self._handle_unittrans(node, entities)
            return operations, entities, result_entities

        if op == "comparison":
            raise ValidationError("Comparison operations should be handled separately")

        # Handle regular operations
        child_ents = node.get("entities", [])
        my_result = node.get("result_container")

        if len(child_ents) < 2:
            return operations, entities, result_entities

        left_child = child_ents[0]
        right_child = child_ents[1]

        # Determine container name
        container_name = None
        if my_result and isinstance(my_result, dict):
            container_name = my_result.get("container_name")

        # Handle bracket logic
        need_brackets = self._should_add_brackets(parent_op, op, container_name, parent_container_name)
        start_len = len(entities)

        # Construct operation path for use in child paths (but don't record operation yet)
        operation_path = f"{current_path}/operation" if current_path else "operation"

        # Process left child (use operation_path for correct nested path)
        if "operation" in left_child:
            left_path = f"{operation_path}/entities[0]"
            self._extract_operations_and_entities(
                left_child, operations, entities, result_entities, op, container_name, left_path)
        else:
            entities.append(left_child)

        # Record current operation with DSL path (preserve original order)
        operations.append({"entity_type": op, "_dsl_path": operation_path})

        # Process right child (use operation_path for correct nested path)
        if "operation" in right_child:
            right_path = f"{operation_path}/entities[1]"
            self._extract_operations_and_entities(
                right_child, operations, entities, result_entities, op, container_name, right_path)
        else:
            entities.append(right_child)

        # Add brackets if needed
        if need_brackets and len(entities) > start_len:
            entities[start_len]["bracket"] = "left"
            entities[-1]["bracket"] = "right"

        # Handle result entities
        if parent_op is None and my_result and isinstance(my_result, dict):
            result_entities.append(my_result)

        return operations, entities, result_entities
    
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
    
    def _extract_operations_and_entities_for_comparison(self, data: Dict[str, Any]) -> Tuple:
        """Extract operations and entities for comparison operations."""
        if "entities" not in data or len(data["entities"]) < 2:
            return [], [], [], [], [], []

        compare1_data = data["entities"][0]
        compare2_data = data["entities"][1]

        def safe_extract(data_piece):
            ret = self._extract_operations_and_entities(data_piece)
            if len(ret) == 2:
                ops, ents = ret
                res = []
            else:
                ops, ents, res = ret
            return ops, ents, res

        # Parse compare1 side
        if isinstance(compare1_data, dict) and "operation" in compare1_data:
            compare1_ops, compare1_ents, compare1_res = safe_extract(compare1_data)
        else:
            compare1_ops = []
            compare1_ents = [compare1_data]
            compare1_res = []

        # Parse compare2 side
        if isinstance(compare2_data, dict) and "operation" in compare2_data:
            compare2_ops, compare2_ents, compare2_res = safe_extract(compare2_data)
        else:
            compare2_ops = []
            compare2_ents = [compare2_data]
            compare2_res = []

        return (compare1_ops, compare1_ents, compare1_res, 
                compare2_ops, compare2_ents, compare2_res)
    
    def _handle_container_name_conflicts(self, entities: List[Dict[str, Any]], 
                                       result_entities: List[Dict[str, Any]]) -> None:
        """Handle container name conflicts between entities and result containers."""
        if result_entities and entities:
            last_container = result_entities[-1].get('container_name')
            if any(e.get('container_name') == last_container for e in entities) and last_container:
                result_entities[-1]['container_name'] = f"{last_container} (result)"
    
    def _render_comparison(self, compare1_operations: List[Dict[str, Any]], 
                         compare1_entities: List[Dict[str, Any]], 
                         compare1_result_entities: List[Dict[str, Any]],
                         compare2_operations: List[Dict[str, Any]], 
                         compare2_entities: List[Dict[str, Any]], 
                         compare2_result_entities: List[Dict[str, Any]],
                         svg_root: etree.Element) -> bool:
        """Render comparison visualization."""
        entity_boxes = [None, None]
        current_x = 50
        current_y = 150

        # Render both sides
        for i in range(2):
            if i == 0:
                operations = compare1_operations
                entities = compare1_entities
                result_entities = compare1_result_entities
            else:
                operations = compare2_operations
                entities = compare2_entities
                result_entities = compare2_result_entities

            try:
                created, w, h = self._render_regular_operation(
                    operations, entities, svg_root, result_entities, 
                    start_x=current_x, start_y=current_y, return_dimensions=True
                )
                svg_width, svg_height = int(float(w)), int(float(h))
                entity_boxes[i] = (current_x, current_y, svg_width, svg_height)
                current_x += svg_width + 110
            except Exception:
                return False

        # Draw balance scale
        self._draw_balance_scale(svg_root, entity_boxes)
        return True
    
    def _render_regular_operation(self, operations: List[Dict[str, Any]], 
                                entities: List[Dict[str, Any]], 
                                svg_root: etree.Element,
                                result_entities: Optional[List[Dict[str, Any]]] = None,
                                start_x: int = 50, start_y: int = 100,
                                return_dimensions: bool = False) -> Tuple[bool, str, str]:
        """Render regular operation visualization."""
        if result_entities is None:
            result_entities = []
            
        # Adjust item size for unit transformations
        if any("unittrans_unit" in entity for entity in entities):
            self.constants["ITEM_SIZE"] = 3 * self.constants["ITEM_SIZE"]

        # Determine layouts and calculate dimensions
        self._determine_entity_layouts(entities)
        self._calculate_entity_dimensions(entities)
        
        # Position entities and operators
        self._position_elements(entities, operations, start_x, start_y)
        
        # Draw entities with path tracking
        for i, entity in enumerate(entities):
            entity_path = entity.get('_dsl_path', f'entities[{i}]')
            self._draw_entity(entity, svg_root, entity_path)
        
        # Draw operators
        if operations:
            self._draw_operators(operations, svg_root)
        
        # Draw equals and question mark
        self._draw_equation_elements(entities, operations, svg_root, start_x, start_y)
        
        # Return dimensions if requested
        if return_dimensions:
            max_x, max_y = self.svg_embedder.get_max_dimensions()
            return True, str(max_x - start_x), str(max_y)
        
        return True, "0", "0"
    
    def _determine_entity_layouts(self, entities: List[Dict[str, Any]]) -> None:
        """Determine layout type for each entity."""
        for e in entities:
            q = e["item"].get("entity_quantity", 0)
            t = e["item"].get("entity_type", "")
            container = e.get("container_type", "")
            attr = e.get("attr_entity_type", "")
            
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
        
        largest_q = max(quantities) if quantities else 1
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
    
    def _position_elements(self, entities: List[Dict[str, Any]], 
                         operations: List[Dict[str, Any]], 
                         start_x: int, start_y: int) -> None:
        """Position entities and operators."""
        operator_gap = e_gap = eq_gap = qmark_gap = 20
        current_x = start_x
        position_box_y = start_y
        
        for i, entity in enumerate(entities):
            entity["planned_x"] = current_x
            
            if entity.get("unittrans_unit", ""):
                entity["planned_y"] = start_y
                entity["planned_box_y"] = start_y - 50
                if i == 0:
                    position_box_y = start_y - 50
            else:
                entity["planned_y"] = start_y
                entity["planned_box_y"] = start_y
                if i == 0:
                    position_box_y = start_y
            
            e_right = current_x + entity["planned_width"]
            
            if operations and i < len(operations):
                operator_x = e_right + operator_gap
                operator_y = position_box_y + (entities[0]["planned_height"] / 2) - (self.constants["OPERATOR_SIZE"] / 2)
                
                operations[i]["planned_x"] = operator_x
                operations[i]["planned_y"] = operator_y
                
                current_x = operator_x + self.constants["OPERATOR_SIZE"] + e_gap
            else:
                current_x = e_right + e_gap
    
    def _draw_entity(self, entity: Dict[str, Any], svg_root: etree.Element, dsl_path: str = "") -> None:
        """Draw a single entity with metadata."""
        q = entity["item"].get("entity_quantity", 0)
        t = entity["item"].get("entity_type", "apple")
        container_name = entity.get("container_name", "").strip()
        container_type = entity.get("container_type", "").strip()
        attr_name = entity.get("attr_name", "").strip()
        attr_entity_type = entity.get("attr_entity_type", "").strip()
        
        unittrans_unit = entity.get("unittrans_unit", "")
        unittrans_value = entity.get("unittrans_value", None)
        
        x = entity["planned_x"]
        y = entity["planned_y"]
        box_y = entity["planned_box_y"]
        w = entity["planned_width"]
        h = entity["planned_height"]
        layout = entity["layout"]
        cols = entity["cols"]
        rows = entity["rows"]
        
        q = float(q)
        
        if layout == "multiplier":
            self._draw_multiplier_text(entity, svg_root, x, w, q)
            return
        
        # Use dsl_path as component ID (hierarchical path)
        entity_dsl_path = entity.get('_dsl_path', dsl_path)
        
        # Draw entity box with metadata
        # Ensure the box can receive pointer events even when fill is none or when
        # other SVG elements overlap in z-order. This makes hover highlighting
        # via frontend listeners reliable on the rectangle border and area.
        rect_elem = etree.SubElement(
            svg_root,
            "rect",
            x=str(x),
            y=str(box_y),
            width=str(w),
            height=str(h),
            stroke="black",
            fill="none",
            style="pointer-events: all; cursor: pointer;",
        )
        rect_elem.set('data-dsl-path', entity_dsl_path)
        
        # Draw brackets if needed
        self._draw_brackets(entity, svg_root, x, w, box_y, h)
        
        # Update max dimensions
        self.svg_embedder.update_max_dimensions(x + w, y + h)
        
        # Embed top figures and text
        self.embed_top_figures_and_text(svg_root, x, box_y, w, container_type, 
                                       container_name, attr_entity_type, attr_name)
        
        # Draw entity content
        if layout == "large":
            self._draw_large_entity(entity, svg_root, x, y, w, h, t, q, unittrans_unit, unittrans_value)
        else:
            self._draw_normal_entity(entity, svg_root, x, y, t, q, cols, rows, unittrans_unit, unittrans_value)
    
    def _draw_multiplier_text(self, entity: Dict[str, Any], svg_root: etree.Element, 
                            x: float, w: float, q: float) -> None:
        """Draw multiplier text."""
        q_str = str(int(q)) if q.is_integer() else str(q)
        text_x = x + w/2
        # This would need access to position_box_y and entities[0] - simplified for now
        text_y = 200  # Placeholder - would need proper calculation
        
        text_element = etree.SubElement(svg_root, "text", x=str(text_x), y=str(text_y),
                                       style="font-size: 50px; pointer-events: auto;", dominant_baseline="middle")
        text_element.text = q_str
        
        # Add component metadata for quantity text
        entity_dsl_path = entity.get('_dsl_path', '')
        if entity_dsl_path:
            quantity_dsl_path = f"{entity_dsl_path}/entity_quantity"
            text_element.set('data-dsl-path', quantity_dsl_path)
        
        self.svg_embedder.update_max_dimensions(text_x + len(q_str)*30, text_y + 50)
    
    def _draw_brackets(self, entity: Dict[str, Any], svg_root: etree.Element, 
                      x: float, w: float, box_y: float, h: float) -> None:
        """Draw brackets around entity if needed."""
        bracket_y = box_y + h/2 + 13  # Simplified calculation
        
        if entity.get("bracket") == "left":
            text_element = etree.SubElement(svg_root, "text",
                                           x=str(x-20), y=str(bracket_y),
                                           style="font-size: 60px; pointer-events: none;",
                                           text_anchor="middle", dominant_baseline="middle")
            text_element.text = "("
        elif entity.get("bracket") == "right":
            text_element = etree.SubElement(svg_root, "text",
                                           x=str(x+w), y=str(bracket_y),
                                           style="font-size: 60px; pointer-events: none;",
                                           text_anchor="middle", dominant_baseline="middle")
            text_element.text = ")"
    
    def _draw_large_entity(self, entity: Dict[str, Any], svg_root: etree.Element, 
                         x: float, y: float, w: float, h: float, t: str, q: float,
                         unittrans_unit: str, unittrans_value: Any) -> None:
        """Draw large quantity entity."""
        q_str = str(int(q)) if q.is_integer() else str(q)
        total_width = self.constants["ITEM_SIZE"] * 4
        start_x_line = x + (w - total_width)/2
        svg_x = start_x_line
        svg_y = y + self.constants["ITEM_PADDING"]
        text_y = y + self.constants["ITEM_PADDING"] + 2.4 * self.constants["ITEM_SIZE"]
        text_x = svg_x + self.constants["ITEM_SIZE"]
        
        # Add item SVG
        item_svg_path = os.path.join(self.resources_path, f"{t}.svg")
        svg_root.append(self.svg_embedder.embed_svg(
            item_svg_path, x=svg_x, y=svg_y, 
            width=self.constants["ITEM_SIZE"] * 4, height=self.constants["ITEM_SIZE"] * 4
        ))
        
        # Add quantity text with component metadata
        font_size = "100px" if unittrans_unit and unittrans_value is not None else "45px"
        text_element = etree.SubElement(svg_root, "text", x=str(text_x), y=str(text_y),
                                       style=f"font-size: {font_size}; fill: white; font-weight: bold; stroke: black; stroke-width: 2px; pointer-events: auto;",
                                       dominant_baseline="middle")
        text_element.text = q_str
        
        # Add component metadata for quantity text
        entity_dsl_path = entity.get('_dsl_path', '')
        if entity_dsl_path:
            quantity_dsl_path = f"{entity_dsl_path}/entity_quantity"
            text_element.set('data-dsl-path', quantity_dsl_path)

        # Add unit transformation circle if needed
        if unittrans_unit and unittrans_value is not None:
            self._draw_unit_transformation_circle(svg_root, x, svg_y, unittrans_value)
    
    def _draw_normal_entity(self, entity: Dict[str, Any], svg_root: etree.Element, 
                          x: float, y: float, t: str, q: float, cols: int, rows: int,
                          unittrans_unit: str, unittrans_value: Any) -> None:
        """Draw normal quantity entity with individual items."""
        if entity["layout"] in ["normal", "row", "column"]:
            item_svg_path = os.path.join(self.resources_path, f"{t}.svg")
            
            for i in range(int(q)):
                row = i // cols
                col = i % cols
                unit_trans_padding = 50 if unittrans_unit and row != 0 else 0
                
                item_x = x + self.constants["BOX_PADDING"] / 2 + col * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"])
                item_y = y + self.constants["BOX_PADDING"] / 2 + row * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"] + unit_trans_padding)
                
                # Draw the item
                svg_root.append(self.svg_embedder.embed_svg(
                    item_svg_path, x=item_x, y=item_y, 
                    width=self.constants["ITEM_SIZE"], height=self.constants["ITEM_SIZE"]
                ))
                
                # Add unit transformation circle if needed
                if unittrans_unit:
                    self._draw_unit_transformation_circle(svg_root, item_x, item_y, unittrans_value)
    
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
    
    def _draw_operators(self, operations: List[Dict[str, Any]], svg_root: etree.Element) -> None:
        """Draw operation symbols."""
        operator_svg_mapping = {
            "surplus": "division",
            "area": "multiplication",
            "default": "addition"
        }
        
        for operator in operations:
            operator_type = operator['entity_type']
            mapped_operator_type = operator_svg_mapping.get(operator_type, operator_type)
            operator_svg_path = os.path.join(self.resources_path, f"{mapped_operator_type}.svg")
            
            if not os.path.exists(operator_svg_path):
                fallback_type = operator_svg_mapping["default"]
                operator_svg_path = os.path.join(self.resources_path, f"{fallback_type}.svg")
            
            # Create a group element to contain the operation and add interactivity
            operation_group = etree.SubElement(svg_root, 'g')
            operation_group.set('data-dsl-path', operator.get('_dsl_path', ''))
            operation_group.set('style', 'pointer-events: all; cursor: pointer;')
            
            operation_group.append(self.svg_embedder.embed_svg(
                operator_svg_path,
                x=operator["planned_x"], y=operator["planned_y"],
                width=self.constants["OPERATOR_SIZE"], height=self.constants["OPERATOR_SIZE"]
            ))
    
    def _draw_equation_elements(self, entities: List[Dict[str, Any]], 
                              operations: List[Dict[str, Any]], 
                              svg_root: etree.Element, start_x: int, start_y: int) -> None:
        """Draw equals sign and question mark."""
        if not entities:
            return
            
        # Calculate positions
        last_entity = entities[-1]
        eq_x = last_entity["planned_x"] + last_entity["planned_width"] + 20
        eq_y = start_y + (entities[0]["planned_height"] / 2) - (self.constants["OPERATOR_SIZE"] / 2)
        
        # Draw equals sign
        equals_svg_path = os.path.join(self.resources_path, "equals.svg")
        if os.path.exists(equals_svg_path):
            svg_root.append(self.svg_embedder.embed_svg(equals_svg_path, x=eq_x, y=eq_y, width=30, height=30))
        
        # Draw question mark(s)
        qmark_x = eq_x + 50
        qmark_y = eq_y - 15
        
        if operations and operations[-1]["entity_type"] == "surplus":
            # Draw two question marks for surplus operations
            question_mark_svg_path = os.path.join(self.resources_path, "question.svg")
            if os.path.exists(question_mark_svg_path):
                svg_root.append(self.svg_embedder.embed_svg(question_mark_svg_path, x=qmark_x, y=qmark_y, width=60, height=60))
                
                # Add "with remainder" text
                text_x = qmark_x + 70
                text_y = qmark_y + 35
                text_element = etree.SubElement(svg_root, "text", x=str(text_x), y=str(text_y),
                                               style="font-size: 15px; pointer-events: none;", dominant_baseline="middle")
                text_element.text = "with remainder"
                
                # Second question mark
                second_qmark_x = text_x + 100
                svg_root.append(self.svg_embedder.embed_svg(question_mark_svg_path, x=second_qmark_x, y=qmark_y, width=60, height=60))
        else:
            # Single question mark
            question_mark_svg_path = os.path.join(self.resources_path, "question.svg")
            if os.path.exists(question_mark_svg_path):
                svg_root.append(self.svg_embedder.embed_svg(question_mark_svg_path, x=qmark_x, y=qmark_y, width=60, height=60))
    
    def _draw_balance_scale(self, svg_root: etree.Element, entity_boxes: List[Tuple[float, float, float, float]]) -> None:
        """Draw balance scale for comparison operations."""
        if len(entity_boxes) != 2 or not all(entity_boxes):
            return
            
        left_x, left_y, left_w, left_h = entity_boxes[0]
        right_x, right_y, right_w, right_h = entity_boxes[1]
        
        # Calculate positions
        bottom_of_figures = max(left_h, right_h)
        center_x = ((left_x + left_w) + right_x) / 2.0
        
        # Create balance scale group
        balance_group = etree.SubElement(svg_root, 'g', id='balance-scale')
        
        # Draw plates
        self._draw_scale_plate(balance_group, left_x, left_w, bottom_of_figures + 10)
        self._draw_scale_plate(balance_group, right_x, right_w, bottom_of_figures + 10)
        
        # Draw horizontal bar
        horizontal_bar_x = left_x + left_w/2
        horizontal_bar_y = bottom_of_figures + 75
        horizontal_bar_width = right_x + right_w/2 - (left_x + left_w/2)
        
        etree.SubElement(balance_group, 'rect',
                        x=str(horizontal_bar_x), y=str(horizontal_bar_y),
                        width=str(horizontal_bar_width), height="20",
                        fill='#f58d42')
        
        # Draw support sticks
        self._draw_support_stick(balance_group, horizontal_bar_x, horizontal_bar_y)
        self._draw_support_stick(balance_group, horizontal_bar_x + horizontal_bar_width, horizontal_bar_y)
        
        # Draw central stick and base
        central_stick_x = horizontal_bar_x + horizontal_bar_width/2
        etree.SubElement(balance_group, 'rect',
                        x=str(central_stick_x), y=str(horizontal_bar_y),
                        width="20", height="100", fill='#f58d42')
        
        # Draw base
        base_y = horizontal_bar_y + 100
        base_x = central_stick_x - 20
        etree.SubElement(balance_group, 'rect',
                        x=str(base_x), y=str(base_y),
                        width="60", height="50", fill='#f58d42')
        
        # Update SVG height
        svg_root.attrib["height"] = str(base_y + 70)
    
    def _draw_scale_plate(self, balance_group: etree.Element, 
                         plate_x: float, plate_w: float, plate_y: float) -> None:
        """Draw a single scale plate."""
        curve_offset = 90
        plate_mid_x = plate_x + plate_w / 2.0
        plate_bottom_y = plate_y + curve_offset
        
        plate_path = (
            f"M {plate_x} {plate_y} "
            f"L {plate_x + plate_w} {plate_y} "
            f"Q {plate_mid_x} {plate_bottom_y} {plate_x} {plate_y} Z"
        )
        
        etree.SubElement(balance_group, 'path', d=plate_path, fill="#f58d42", 
                        stroke="#f58d42", attrib={"stroke-width": "2"})
    
    def _draw_support_stick(self, balance_group: etree.Element, x: float, bar_y: float) -> None:
        """Draw a support stick for the balance scale."""
        etree.SubElement(balance_group, 'rect',
                        x=str(x), y=str(bar_y - 50),
                        width="10", height="70", fill='#f58d42')


# Convenience function to maintain compatibility
def render_svgs_from_data(output_file: str, resources_path: str, data: Dict[str, Any]) -> bool:
    """Convenience function for rendering formal visuals."""
    generator = FormalVisualGenerator(resources_path)
    return generator.render_svgs_from_data(output_file, data)



