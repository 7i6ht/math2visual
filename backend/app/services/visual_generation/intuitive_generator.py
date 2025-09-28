"""
Refactored intuitive visual generator without global state dependencies.
"""
import math
import os
import copy
import random
from typing import Dict, List, Tuple, Any, Optional
from lxml import etree

from .base_generator import BaseVisualGenerator
from .utils import ValidationError, VisualGenerationError


class IntuitiveVisualGenerator(BaseVisualGenerator):
    """Generates intuitive visual representations of mathematical problems."""
    
    def __init__(self, resources_path: str):
        super().__init__(resources_path)
        # Cross colors for subtraction visualization
        self.cross_colors = ["black", "red", "blue"]
    
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
        comparison_data = self._extract_operations_and_containers_for_comparison(data)
        (compare1_operations, compare1_containers, compare1_result_containers,
         compare2_operations, compare2_containers, compare2_result_containers) = comparison_data
        
        # Update container types
        compare1_containers, compare1_result_containers = self.update_container_types_optimized(
            compare1_containers, compare1_result_containers)
        compare2_containers, compare2_result_containers = self.update_container_types_optimized(
            compare2_containers, compare2_result_containers)
        
        # Handle container name conflicts
        self._handle_container_name_conflicts(compare1_containers, compare1_result_containers)
        self._handle_container_name_conflicts(compare2_containers, compare2_result_containers)
        
        # Get the DSL path for the comparison operation
        comparison_dsl_path = data.get('_dsl_path', 'operation')
        
        return self._render_comparison(
            compare1_operations, compare1_containers, compare1_result_containers,
            compare2_operations, compare2_containers, compare2_result_containers,
            svg_root, comparison_dsl_path
        )
    
    def _handle_regular_operation(self, data: Dict[str, Any], svg_root: etree.Element) -> bool:
        """Handle regular (non-comparison) operations."""
        operations, containers, result_containers = self._extract_operations_and_containers(data)
        
        # Update container types and handle conflicts
        containers, result_containers = self.update_container_types_optimized(containers, result_containers)
        self._handle_container_name_conflicts(containers, result_containers)
        
        # Convert operations to expected format (matching old logic)
        operations = [{"entity_type": op["entity_type"]} for op in operations]
        
        print(f"Operations: {operations}")
        print(f"containers: {containers}")
        print(f"Result containers: {result_containers}")
        
        # Choose appropriate handler based on operation type (restore old complex logic)
        if not operations:
            return False
        
        # Restore the original complex conditional logic
        if all(op["entity_type"] in ["addition", "subtraction"] for op in operations):
            print("Handling tvq_final")
            try:
                return self._handle_tvq_final(operations, containers, result_containers, svg_root)
            except Exception as e:
                print(f"Error in handle_tvq_final: {e}")
                return False
        elif all(op["entity_type"] == "multiplication" for op in operations) and len(operations) == 1:
            print("Handling multiplication")
            try:
                return self._handle_multiplication(operations, containers, result_containers, svg_root)
            except Exception as e:
                print(f"Error in handle_multiplication: {e}")
                return False
        elif all(op["entity_type"] == "division" for op in operations) and len(operations) == 1:
            print("Handling division")
            try:
                return self._handle_division(operations, containers, result_containers, svg_root)
            except Exception as e:
                print(f"Error in handle_division: {e}")
                return False
        elif all(op["entity_type"] == "surplus" for op in operations) and len(operations) == 1:
            print("Handling surplus")
            try:
                return self._handle_surplus(operations, containers, result_containers, svg_root)
            except Exception as e:
                print(f"Error in handle_surplus: {e}")
                return False
        elif all(op["entity_type"] == "area" for op in operations) and len(operations) == 1:
            print("Handling area")
            try:
                return self._handle_area(operations, containers, result_containers, svg_root)
            except Exception as e:
                print(f"Error in handle_area: {e}")
                return False
        else:
            print(f"No intuitive visual if mixed with complex operation: {operations}")
            return False
    
    def _extract_operations_and_containers(self, node: Dict[str, Any], 
                                         operations: Optional[List[Dict[str, Any]]] = None,
                                         containers: Optional[List[Dict[str, Any]]] = None,
                                         result_containers: Optional[List[Dict[str, Any]]] = None,
                                         parent_op: Optional[str] = None,
                                         parent_container_name: Optional[str] = None,
                                         current_path: str = "") -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract operations and containers from parsed data structure."""
        if operations is None:
            operations = []
        if containers is None:
            containers = []
        if result_containers is None:
            result_containers = []

        op = node.get("operation", "")

        # Handle special operations
        if op == "unittrans":
            self._handle_unittrans(node, containers)
            return operations, containers, result_containers

        if op == "comparison":
            raise ValidationError("Comparison operations should be handled separately")

        # Handle regular operations
        child_ents = node.get("entities", [])
        my_result = node.get("result_container")

        if len(child_ents) < 2:
            return operations, containers, result_containers

        left_child = child_ents[0]
        right_child = child_ents[1]

        # Determine container name
        container_name = None
        if my_result and isinstance(my_result, dict):
            container_name = my_result.get("container_name")

        # Handle bracket logic
        need_brackets = self._should_add_brackets(parent_op, op, container_name, parent_container_name)
        start_len = len(containers)

        # Construct operation path for use in child paths (but don't record operation yet)
        operation_path = f"{current_path}/operation" if current_path else "operation"

        # Process left child (use operation_path for correct nested path)
        if "operation" in left_child:
            left_path = f"{operation_path}/entities[0]"
            self._extract_operations_and_containers(
                left_child, operations, containers, result_containers, op, container_name, left_path)
        else:
            containers.append(left_child)

        # Record current operation with DSL path (preserve original order)
        operations.append({"entity_type": op, "_dsl_path": operation_path})

        # Process right child (use operation_path for correct nested path)
        if "operation" in right_child:
            right_path = f"{operation_path}/entities[1]"
            self._extract_operations_and_containers(
                right_child, operations, containers, result_containers, op, container_name, right_path)
        else:
            containers.append(right_child)

        # Add brackets if needed
        if need_brackets and len(containers) > start_len:
            containers[start_len]["bracket"] = "left"
            containers[-1]["bracket"] = "right"

        # Handle result containers
        if parent_op is None and my_result and isinstance(my_result, dict):
            result_containers.append(my_result)

        return operations, containers, result_containers
    
    
    
    def _extract_operations_and_containers_for_comparison(self, data: Dict[str, Any]) -> Tuple:
        """Extract operations and containers for comparison operations."""
        if "entities" not in data or len(data["entities"]) < 2:
            return [], [], [], [], [], []

        compare1_data = data["entities"][0]
        compare2_data = data["entities"][1]

        def safe_extract(data_piece, current_path=""):
            ret = self._extract_operations_and_containers(data_piece, current_path=current_path)
            if len(ret) == 2:
                ops, ents = ret
                res = []
            else:
                ops, ents, res = ret
            return ops, ents, res

        # Parse compare1 side
        if isinstance(compare1_data, dict) and "operation" in compare1_data:
            compare1_ops, compare1_ents, compare1_res = safe_extract(compare1_data, "operation/entities[0]")
        else:
            compare1_ops = []
            compare1_ents = [compare1_data]
            compare1_res = []

        # Parse compare2 side
        if isinstance(compare2_data, dict) and "operation" in compare2_data:
            compare2_ops, compare2_ents, compare2_res = safe_extract(compare2_data, "operation/entities[1]")
        else:
            compare2_ops = []
            compare2_ents = [compare2_data]
            compare2_res = []

        return (compare1_ops, compare1_ents, compare1_res, 
                compare2_ops, compare2_ents, compare2_res)
    
    
    def _handle_multiplication(self, operations: List[str], containers: List[Dict[str, Any]], 
                             result_containers: List[Dict[str, Any]], svg_root: etree.Element,
                             start_x: int = 50, start_y: int = 150) -> bool:
        """Handle multiplication operations."""
        if len(containers) != 2:
            raise ValidationError("Multiplication requires exactly two containers")
            
        if containers[1]["item"].get("entity_type", "") != "multiplier":
            raise ValidationError("Second container must be a multiplier")
            
        multiplier_val = int(containers[1]["item"].get("entity_quantity", 1))
        
        if multiplier_val > 12:
            raise ValidationError("No INTUITIVE visual can be generated because multiplier has entity_quantity higher than 12")
        
        # Replicate the first entity
        base_entity = containers[0]
        replicated = []
        for i in range(multiplier_val):
            e_copy = copy.deepcopy(base_entity)
            e_copy["replica_index"] = i
            replicated.append(e_copy)
        
        containers = replicated
        
        # Use common rendering logic
        return self._render_container_grid(containers, result_containers, svg_root, start_x, start_y)
    
    def _handle_division(self, operations: List[str], containers: List[Dict[str, Any]], 
                        result_containers: List[Dict[str, Any]], svg_root: etree.Element,
                        start_x: int = 50, start_y: int = 150) -> bool:
        """Handle division operations."""
        if len(containers) != 2:
            raise ValidationError("Division requires exactly two containers")
            
        dividend_entity = containers[0]
        divisor_entity = containers[1]
        
        dividend_quantity = dividend_entity["item"].get("entity_quantity", 0)
        divisor_quantity = divisor_entity["item"].get("entity_quantity", 1)
        
        if not self.math_parser.is_int(dividend_quantity) or not self.math_parser.is_int(divisor_quantity):
            raise ValidationError("Division quantities must be integers")
        
        dividend_quantity = int(dividend_quantity)
        divisor_quantity = int(divisor_quantity)
        
        if divisor_quantity <= 0:
            raise ValidationError("Cannot divide by zero or negative quantity")
        
        if dividend_quantity % divisor_quantity != 0:
            raise ValidationError(f"INTUITIVE visual not possible: {dividend_quantity} cannot be evenly divided by {divisor_quantity}")
        
        result_count = dividend_quantity // divisor_quantity
        
        # Determine division type and create replicated containers
        entity_types_same = (dividend_entity["item"].get("entity_type", "") == 
                           divisor_entity["item"].get("entity_type", "") and
                           dividend_entity["item"].get("entity_type", "") and
                           divisor_entity["item"].get("entity_type", ""))
        
        if entity_types_same:
            if result_count > 12:
                raise ValidationError("Division result rectangle number higher than 12")
            replicated = self._create_division_containers_same_type(dividend_entity, divisor_entity, result_count)
        else:
            if divisor_quantity > 12:
                raise ValidationError("Division result rectangle number higher than 12")
            replicated = self._create_division_containers_different_type(dividend_entity, divisor_entity, divisor_quantity, result_count)
        
        return self._render_division_result(replicated, containers, svg_root, start_x, start_y, entity_types_same)
    
    def _create_division_containers_same_type(self, dividend_entity: Dict[str, Any], 
                                            divisor_entity: Dict[str, Any], 
                                            result_count: int) -> List[Dict[str, Any]]:
        """Create containers for division with same entity types."""
        visual_entity = copy.deepcopy(dividend_entity)
        visual_entity["item"]["entity_quantity"] = divisor_entity["item"].get("entity_quantity", 1)
        
        if divisor_entity.get('container_name'):
            visual_entity['container_name'] = divisor_entity['container_name']
            visual_entity['container_type'] = divisor_entity['container_type']
        else:
            visual_entity['container_name'] = divisor_entity['entity_name']
            visual_entity['container_type'] = divisor_entity['item']['entity_type']
        
        visual_entity['attr_name'] = divisor_entity.get('attr_name', '')
        visual_entity['attr_type'] = divisor_entity.get('attr_type', '')
        
        # Use the DSL path from the divisor_entity since the visual represents divisor containers
        visual_entity['_dsl_path'] = divisor_entity.get('_dsl_path', '')
        
        replicated = []
        for i in range(result_count):
            e_copy = copy.deepcopy(visual_entity)
            e_copy["replica_index"] = i
            replicated.append(e_copy)
        
        return replicated
    
    def _create_division_containers_different_type(self, dividend_entity: Dict[str, Any], 
                                                 divisor_entity: Dict[str, Any], 
                                                 divisor_quantity: int, 
                                                 result_count: int) -> List[Dict[str, Any]]:
        """Create containers for division with different entity types."""
        visual_entity = copy.deepcopy(dividend_entity)
        visual_entity["item"]["entity_quantity"] = result_count
        
        if divisor_entity.get('entity_name'):
            visual_entity['container_name'] = divisor_entity['entity_name']
            visual_entity['container_type'] = divisor_entity['item']['entity_type']
        else:
            visual_entity['container_name'] = divisor_entity.get('container_name', '')
            visual_entity['container_type'] = divisor_entity.get('container_type', '')
        
        visual_entity['attr_name'] = divisor_entity.get('attr_name', '')
        visual_entity['attr_type'] = divisor_entity.get('attr_type', '')
        
        # Use the DSL path from the divisor_entity since the visual represents divisor containers
        visual_entity['_dsl_path'] = divisor_entity.get('_dsl_path', '')
        
        replicated = []
        for i in range(divisor_quantity):
            e_copy = copy.deepcopy(visual_entity)
            e_copy["replica_index"] = i
            replicated.append(e_copy)
        
        return replicated
    
    def _handle_surplus(self, operations: List[str], containers: List[Dict[str, Any]], 
                       result_containers: List[Dict[str, Any]], svg_root: etree.Element,
                       start_x: int = 50, start_y: int = 150) -> bool:
        """Handle surplus (division with remainder) operations."""
        if len(containers) != 2:
            raise ValidationError("Surplus requires exactly two containers")
        
        dividend_entity = containers[0]
        divisor_entity = containers[1]
        
        dividend_quantity = int(dividend_entity["item"].get("entity_quantity", 0))
        divisor_quantity = int(divisor_entity["item"].get("entity_quantity", 1))
        
        if divisor_quantity <= 0:
            raise ValidationError("Cannot divide by zero or negative quantity")
        
        result_count = dividend_quantity // divisor_quantity
        remainder_quantity = dividend_quantity % divisor_quantity
        
        # Create containers for the main result
        entity_types_same = (dividend_entity["item"].get("entity_type", "") == 
                           divisor_entity["item"].get("entity_type", ""))
        
        if entity_types_same:
            replicated = self._create_division_containers_same_type(dividend_entity, divisor_entity, result_count)
        else:
            replicated = self._create_division_containers_different_type(dividend_entity, divisor_entity, divisor_quantity, result_count)
        
        # Add remainder container
        remainder_entity = copy.deepcopy(replicated[0] if replicated else dividend_entity)
        remainder_entity["item"]["entity_quantity"] = remainder_quantity
        remainder_entity["container_name"] = "Remainder"
        remainder_entity["container_type"] = "row" if containers[0].get('container_type') == 'row' else "remainder"
        remainder_entity["attr_name"] = ""
        remainder_entity["attr_type"] = ""
        # Use the result container's DSL path for the remainder
        if result_containers and result_containers[0].get('_dsl_path'):
            remainder_entity["_dsl_path"] = result_containers[0]['_dsl_path']
        replicated.append(remainder_entity)
        
        return self._render_container_grid(replicated, result_containers, svg_root, start_x, start_y)
    
    def _handle_area(self, operations: List[str], containers: List[Dict[str, Any]], 
                    result_containers: List[Dict[str, Any]], svg_root: etree.Element,
                    start_x: int = 100, start_y: int = 100) -> bool:
        """Handle area calculation operations."""
        # Simplified area handling - would need more complex logic for full implementation
        return self._render_container_grid(containers, result_containers, svg_root, start_x, start_y)
    
    def _handle_tvq_final(self, operations: List[str], containers: List[Dict[str, Any]], 
                         result_containers: List[Dict[str, Any]], svg_root: etree.Element,
                         start_x: int = 50, start_y: int = 150) -> bool:
        """Handle general operations (addition, subtraction, etc.)."""
        return self._render_container_grid(containers, result_containers, svg_root, start_x, start_y)
    
    def _render_container_grid(self, containers: List[Dict[str, Any]], 
                             result_containers: List[Dict[str, Any]], 
                             svg_root: etree.Element,
                             start_x: int = 50, start_y: int = 150) -> bool:
        """Render containers in a grid layout."""
        # Adjust item size for unit transformations
        if any("unittrans_unit" in entity for entity in containers):
            self.constants["ITEM_SIZE"] = 3 * self.constants["ITEM_SIZE"]
        
        # Determine layouts and calculate dimensions
        self._determine_entity_layouts(containers)
        self._calculate_entity_dimensions(containers)
        
        # Position containers
        self._position_containers(containers, start_x, start_y)
        
        # Draw containers with path tracking
        for i, container in enumerate(containers):
            container_path = container.get('_dsl_path', f'containers[{i}]')
            self._draw_container(container, svg_root, container_path)
        
        # Draw enclosing box if multiple containers
        if len(containers) > 1 and result_containers:
            self._draw_enclosing_box(containers, result_containers[-1], svg_root)
        elif len(containers) == 1:
            self._draw_question_mark_circle(containers[0], svg_root)
        
        return True
    
    
    
    
    def _position_containers(self, containers: List[Dict[str, Any]], start_x: int, start_y: int) -> None:
        """Position containers in a grid layout."""
        repeated_ents = [e for e in containers if e.get("layout") != "multiplier"]
        container_name = containers[0].get('container_name', "") if containers else ""
        
        # Determine grid layout
        count = len(repeated_ents)
        if container_name == "row":
            grid_cols = 1
            grid_rows = (count + grid_cols - 1) // grid_cols
        elif container_name == "column":
            grid_rows = 1
            grid_cols = (count + grid_rows - 1) // grid_rows
        elif count > 0:
            grid_cols = int(math.ceil(math.sqrt(count)))
            grid_rows = (count + grid_cols - 1) // grid_cols
        else:
            grid_cols = 1
            grid_rows = 1
        
        # Position each container
        gap_x = gap_y = 20
        
        for i, e in enumerate(repeated_ents):
            row = i // grid_cols
            col = i % grid_cols
            
            if i == 0:
                x_pos = start_x
                y_pos = start_y
            else:
                x_pos = start_x + col * (repeated_ents[i-1]["planned_width"] + gap_x)
                y_pos = start_y + row * (repeated_ents[i-1]["planned_height"] + gap_y + self.constants["UNIT_SIZE"] + 5)
            
            e["planned_x"] = x_pos
            e["planned_y"] = y_pos
            e["planned_box_y"] = y_pos
            
            # Update max dimensions
            right_edge = x_pos + e["planned_width"]
            bottom_edge = y_pos + e["planned_height"]
            self.svg_embedder.update_max_dimensions(right_edge, bottom_edge)
    
    def _draw_container(self, container: Dict[str, Any], svg_root: etree.Element, dsl_path: str = "") -> None:
        """Draw a single container with metadata."""
        q = container["item"].get("entity_quantity", 0)
        t = container["item"].get("entity_type", "apple")
        container_name = container.get("container_name", "").strip()
        container_type = container.get("container_type", "").strip()

        
        unittrans_unit = container.get("unittrans_unit", "")
        unittrans_value = container.get("unittrans_value", "")
        
        x = container["planned_x"]
        y = container["planned_y"]
        box_y = container["planned_box_y"]
        w = container["planned_width"]
        h = container["planned_height"]
        layout = container["layout"]
        cols = container["cols"]
        rows = container["rows"]
        
        q = float(q)
        
        if layout == "multiplier":
            self._draw_multiplier_text(container, svg_root, x, y, w, q)
            return
        
        # Draw container box with metadata
        # Make sure the rectangle is interactive for hover/click events even with fill="none"
        rect_elem = etree.SubElement(
            svg_root,
            "rect",
            x=str(x),
            y=str(box_y),
            width=str(w),
            height=str(h),
            stroke="black",
            fill="none",
            style="pointer-events: all;",
        )
        rect_elem.set('data-dsl-path', dsl_path)
        
        # Update max dimensions
        self.svg_embedder.update_max_dimensions(x + w, y + h)
        
        # Embed top figures and text
        self.embed_top_figures_and_text(svg_root, x, box_y, w, container_type, 
                                       container_name, dsl_path)
        
        # Draw container content
        if layout == "large":
            self._draw_large_container(container, svg_root, x, y, w, h, t, q, unittrans_unit, unittrans_value)
        else:
            self._draw_normal_container(container, svg_root, x, y, t, q, cols, rows, unittrans_unit, unittrans_value)
    
    def _draw_multiplier_text(self, container: Dict[str, Any], svg_root: etree.Element, 
                            x: float, y: float, w: float, q: float) -> None:
        """Draw multiplier text."""
        q_str = str(int(q)) if q.is_integer() else str(q)
        text_x = x
        text_y = y + 100  # Simplified positioning
        
        text_element = etree.SubElement(svg_root, "text", x=str(text_x), y=str(text_y),
                                       style="font-size: 50px; pointer-events: auto;", dominant_baseline="middle")
        text_element.text = q_str
        
        # Add component metadata for quantity text
        container_dsl_path = container.get('_dsl_path', '')
        quantity_dsl_path = f"{container_dsl_path}/entity_quantity"
        text_element.set('data-dsl-path', quantity_dsl_path)
        
        self.svg_embedder.update_max_dimensions(text_x + len(q_str)*30, text_y + 50)
    
    def _draw_large_container(self, container: Dict[str, Any], svg_root: etree.Element, 
                            x: float, y: float, w: float, h: float, t: str, q: float,
                            unittrans_unit: str, unittrans_value: Any) -> None:
        """Draw large quantity container."""
        q_str = str(int(q)) if q.is_integer() else str(q)
        total_width = self.constants["ITEM_SIZE"] * 4
        start_x_line = x + (w - total_width)/2
        svg_x = start_x_line
        
        unit_trans_padding = 50 if unittrans_unit else 0
        svg_y = y + self.constants["ITEM_PADDING"] + unit_trans_padding
        text_y = y + self.constants["ITEM_PADDING"] + 2.4 * self.constants["ITEM_SIZE"]
        text_x = svg_x + self.constants["ITEM_SIZE"]
        
        # Add item SVG with DSL path for interactivity
        item_svg_path = os.path.join(self.resources_path, f"{t}.svg")
        embedded_svg = self.svg_embedder.embed_svg(
            item_svg_path, x=svg_x, y=svg_y, 
            width=self.constants["ITEM_SIZE"] * 4, height=self.constants["ITEM_SIZE"] * 4
        )
        
        # Add DSL path metadata for entity_type highlighting
        container_dsl_path = container.get('_dsl_path', '')
        entity_type_dsl_path = f"{container_dsl_path}/entity_type"
        embedded_svg.set('data-dsl-path', entity_type_dsl_path)
        embedded_svg.set('style', 'pointer-events: all;')
        
        svg_root.append(embedded_svg)
        
        # Add quantity text with component metadata
        font_size = "100px" if unittrans_unit and unittrans_value else "45px"
        text_element = etree.SubElement(svg_root, "text", x=str(text_x), y=str(text_y),
                                       style=f"font-size: {font_size}; fill: white; font-weight: bold; stroke: black; stroke-width: 2px; pointer-events: auto;",
                                       dominant_baseline="middle")
        text_element.text = q_str
        
        # Add component metadata for quantity text
        container_dsl_path = container.get('_dsl_path', '')
        quantity_dsl_path = f"{container_dsl_path}/entity_quantity"
        text_element.set('data-dsl-path', quantity_dsl_path)
        
        # Add unit transformation circle if needed
        if unittrans_unit and unittrans_value:
            self._draw_unit_transformation_circle(svg_root, x, svg_y, unittrans_value)
    
    def _draw_normal_container(self, container: Dict[str, Any], svg_root: etree.Element, 
                             x: float, y: float, t: str, q: float, cols: int, rows: int,
                             unittrans_unit: str, unittrans_value: Any) -> None:
        """Draw normal quantity container with individual items."""
        if container["layout"] in ["normal", "row", "column"]:
            item_svg_path = os.path.join(self.resources_path, f"{t}.svg")
            
            for i in range(int(q)):
                row = i // cols
                col = i % cols
                unit_trans_padding = 50 if unittrans_unit else 0
                
                item_x = x + self.constants["BOX_PADDING"] / 2 + col * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"])
                
                if row == 0:
                    item_y = y + self.constants["BOX_PADDING"] / 2 + unit_trans_padding
                else:
                    item_y = y + self.constants["BOX_PADDING"] / 2 + row * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"] + unit_trans_padding) + unit_trans_padding
                
                # Draw the item with DSL path for interactivity
                embedded_svg = self.svg_embedder.embed_svg(
                    item_svg_path, x=item_x, y=item_y, 
                    width=self.constants["ITEM_SIZE"], height=self.constants["ITEM_SIZE"]
                )
                
                # Add DSL path metadata for entity_type highlighting
                container_dsl_path = container.get('_dsl_path', '')
                entity_type_dsl_path = f"{container_dsl_path}/entity_type[{i}]"
                embedded_svg.set('data-dsl-path', entity_type_dsl_path)
                embedded_svg.set('style', 'pointer-events: all;')
                
                svg_root.append(embedded_svg)
                
                # Draw crosses for subtraction if applicable
                self._draw_subtraction_crosses(container, svg_root, i, item_x, item_y, q, cols)
                
                # Add unit transformation circle if needed
                if unittrans_unit:
                    self._draw_unit_transformation_circle(svg_root, item_x, item_y, unittrans_value)
    
    def _draw_subtraction_crosses(self, container: Dict[str, Any], svg_root: etree.Element, 
                                item_index: int, item_x: float, item_y: float, 
                                total_quantity: float, cols: int) -> None:
        """Draw crosses for subtraction visualization."""
        subtrahend_quantities = container.get("subtrahend_entity_quantity", [])
        if not subtrahend_quantities:
            return
        
        used_colors = set()
        
        for idx, sub_quantity in enumerate(subtrahend_quantities):
            color = self.cross_colors[idx] if idx < len(self.cross_colors) else self._get_random_color(used_colors)
            used_colors.add(color)
            
            # Determine which items to cross for this subtrahend
            start_cross_idx = int(total_quantity) - sum(subtrahend_quantities[:idx + 1])
            end_cross_idx = int(total_quantity) - sum(subtrahend_quantities[:idx])
            
            # Draw cross if this item should be crossed
            if start_cross_idx <= item_index < end_cross_idx:
                self._draw_cross(svg_root, item_x, item_y, color)
    
    def _get_random_color(self, used_colors: set) -> str:
        """Generate a random color not in used_colors."""
        while True:
            color = f"#{''.join([random.choice('0123456789ABCDEF') for _ in range(6)])}"
            if color not in used_colors:
                return color
    
    def _draw_cross(self, svg_root: etree.Element, x: float, y: float, color: str) -> None:
        """Draw a cross over an item."""
        # Horizontal line
        line1 = etree.Element("line",
                             x1=str(x), y1=str(y),
                             x2=str(x + self.constants["ITEM_SIZE"]), y2=str(y + self.constants["ITEM_SIZE"]),
                             style=f"stroke:{color}; stroke-width:2;")
        svg_root.append(line1)
        
        # Vertical line
        line2 = etree.Element("line",
                             x1=str(x + self.constants["ITEM_SIZE"]), y1=str(y),
                             x2=str(x), y2=str(y + self.constants["ITEM_SIZE"]),
                             style=f"stroke:{color}; stroke-width:2;")
        svg_root.append(line2)
    
    
    def _draw_enclosing_box(self, containers: List[Dict[str, Any]], 
                          result_container: Dict[str, Any], svg_root: etree.Element) -> None:
        """Draw enclosing box around multiple containers."""
        max_x, max_y = self.svg_embedder.get_max_dimensions()
        
        big_box_x = 20
        big_box_y = 80
        big_box_width = max_x + 2 * self.constants["MARGIN"] - 80
        big_box_height = max_y + 2 * self.constants["MARGIN"] - 90
        
        # Embed text and figures at the top of the big box
        result_dsl_path = result_container.get('_dsl_path', '')
        self.embed_top_figures_and_text(
            svg_root, big_box_x, big_box_y, big_box_width,
            result_container.get('container_type', ''), result_container.get('container_name', ''),
            result_dsl_path
        )
        
        # Draw the box with DSL path metadata for interactivity
        rect_elem = etree.SubElement(svg_root, "rect", x=str(big_box_x), y=str(big_box_y), 
                        width=str(big_box_width), height=str(big_box_height), 
                        stroke="black", fill="none", stroke_width="2")
        
        # Add DSL path metadata for result container highlighting
        rect_elem.set('data-dsl-path', result_dsl_path)
        # Use stroke-only pointer events so internal elements can still receive events
        rect_elem.set('style', 'pointer-events: stroke;')
        
        # Add question mark circle
        circle_radius = 30
        circle_center_x = big_box_x + big_box_width
        circle_center_y = big_box_y + big_box_height
        
        etree.SubElement(svg_root, "circle", cx=str(circle_center_x), cy=str(circle_center_y), 
                        r=str(circle_radius), fill="#BBA7F4")
        
        text_element = etree.SubElement(svg_root, "text", 
                                       x=str(circle_center_x-6), y=str(circle_center_y+6),
                                       style="font-size: 30px; pointer-events: none;", text_anchor="middle", 
                                       fill="red", dominant_baseline="central")
        text_element.text = "?"
        
        # Update final dimensions
        final_width = max_x + 2 * self.constants["MARGIN"]
        final_height = max_y + 2 * self.constants["MARGIN"] + 50
        svg_root.attrib["width"] = str(int(final_width))
        svg_root.attrib["height"] = str(int(final_height))
    
    def _draw_question_mark_circle(self, container: Dict[str, Any], svg_root: etree.Element) -> None:
        """Draw question mark circle for single container."""
        x = container["planned_x"]
        y = container["planned_y"]
        w = container["planned_width"]
        h = container["planned_height"]
        
        circle_radius = 30
        circle_center_x = x + w
        circle_center_y = y + h
        
        etree.SubElement(svg_root, "circle", cx=str(circle_center_x), cy=str(circle_center_y), 
                        r=str(circle_radius), fill="#BBA7F4")
        
        text_element = etree.SubElement(svg_root, "text", 
                                       x=str(circle_center_x-6), y=str(circle_center_y+6),
                                       style="font-size: 30px; pointer-events: none;", text_anchor="middle", 
                                       fill="red", dominant_baseline="central")
        text_element.text = "?"
    
    def _render_division_result(self, replicated: List[Dict[str, Any]], 
                              original_containers: List[Dict[str, Any]], 
                              svg_root: etree.Element, start_x: int, start_y: int, 
                              entity_types_same: bool) -> bool:
        """Render division result with appropriate styling."""
        # This would contain the specific division rendering logic
        # For now, using the general container grid renderer
        result_containers = [original_containers[0]]  # Use first container as result template
        return self._render_container_grid(replicated, result_containers, svg_root, start_x, start_y)
    
    def _render_comparison(self, compare1_operations: List[Dict[str, Any]], 
                         compare1_containers: List[Dict[str, Any]], 
                         compare1_result_containers: List[Dict[str, Any]],
                         compare2_operations: List[Dict[str, Any]], 
                         compare2_containers: List[Dict[str, Any]], 
                         compare2_result_containers: List[Dict[str, Any]],
                         svg_root: etree.Element, comparison_dsl_path: str = 'operation') -> bool:
        """Render comparison visualization."""
        # Simplified comparison rendering - would need balance scale logic
        return True


# Convenience functions to maintain compatibility
def render_svgs_from_data(output_file: str, resources_path: str, data: Dict[str, Any]) -> bool:
    """Convenience function for rendering intuitive visuals."""
    generator = IntuitiveVisualGenerator(resources_path)
    return generator.render_svgs_from_data(output_file, data)



