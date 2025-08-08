"""
Shared utilities for visual generation modules.
Provides common functionality without relying on global state.
"""
import os
import difflib
import inflect
from lxml import etree
from typing import Dict, List, Optional, Tuple, Any


class SVGCache:
    """Manages SVG file caching and lookup operations."""
    
    def __init__(self):
        self._directory_cache: Dict[str, List[str]] = {}
        self._inflect_engine = inflect.engine()
        self.missing_entities = []  # Track missing entities
    
    def find_svg_file(self, file_path: str) -> str:
        """
        Find SVG file with fallback mechanisms for missing files.
        Returns the actual file path that exists.
        """
        if os.path.exists(file_path):
            return file_path
            
        dir_path = os.path.dirname(file_path)
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        
        # Use cached candidate list if available
        if dir_path in self._directory_cache:
            candidate_files = self._directory_cache[dir_path]
        else:
            candidate_files = [f for f in os.listdir(dir_path) if f.lower().endswith(".svg")]
            self._directory_cache[dir_path] = candidate_files

        candidate_paths = [os.path.join(dir_path, f) for f in candidate_files]
        
        
        # Try different matching strategies
        exact_match = self._try_exact_match(base_name, candidate_paths)       
        found_path = (
            exact_match or
            self._try_inflect_variations(base_name, candidate_paths) or
            self._try_hyphen_variations(base_name, candidate_paths) or
            self._try_fuzzy_match(base_name, candidate_files, dir_path)
        )

        # Track missing entity
        if (exact_match is None):
            entity_name = f"{base_name}.svg"
            if entity_name not in self.missing_entities:
                self.missing_entities.append(entity_name)
        
        if found_path:
            return found_path
        
        raise FileNotFoundError(f"SVG file not found: {file_path}")
    
    def _try_exact_match(self, base_name: str, candidate_paths: List[str]) -> Optional[str]:
        """Try exact case-insensitive match."""
        for candidate in candidate_paths:
            candidate_base = os.path.splitext(os.path.basename(candidate))[0]
            if candidate_base.lower() == base_name.lower():
                return candidate
        return None
    
    def _try_inflect_variations(self, base_name: str, candidate_paths: List[str]) -> Optional[str]:
        """Try singular and plural forms using inflect."""
        singular_form = self._inflect_engine.singular_noun(base_name) or base_name
        plural_form = self._inflect_engine.plural_noun(base_name) or base_name
        
        for mod_name in (plural_form, singular_form):
            result = self._try_exact_match(mod_name, candidate_paths)
            if result:
                return result
        return None
    
    def _try_hyphen_variations(self, base_name: str, candidate_paths: List[str]) -> Optional[str]:
        """Try matching only the part after the hyphen."""
        if "-" not in base_name:
            return None
            
        after_hyphen = base_name.split("-")[-1]
        singular_after = self._inflect_engine.singular_noun(after_hyphen) or after_hyphen
        plural_after = self._inflect_engine.plural_noun(after_hyphen) or after_hyphen
        
        for mod_name in (after_hyphen, plural_after, singular_after):
            result = self._try_exact_match(mod_name, candidate_paths)
            if result:
                return result
        return None
    
    def _try_fuzzy_match(self, base_name: str, candidate_files: List[str], dir_path: str) -> Optional[str]:
        """Use fuzzy matching as last resort."""
        candidate_bases = [os.path.splitext(f)[0] for f in candidate_files]
        close_matches = difflib.get_close_matches(base_name, candidate_bases, n=1, cutoff=0.6)
        
        if close_matches:
            match = close_matches[0]
            return self._try_exact_match(match, [os.path.join(dir_path, f) for f in candidate_files])
        return None


class SVGEmbedder:
    """Handles SVG embedding operations."""
    
    def __init__(self, svg_cache: SVGCache):
        self.svg_cache = svg_cache
        self.max_dimensions = [0, 0]  # [max_x, max_y]
    
    def get_missing_entities(self) -> List[str]:
        """Get list of missing entities from the cache."""
        return self.svg_cache.missing_entities.copy()
    
    def reset_missing_entities(self) -> None:
        """Reset the missing entities tracking."""
        self.svg_cache.missing_entities = []
    
    def embed_svg(self, file_path: str, x: float, y: float, width: float, height: float) -> etree.Element:
        """
        Embed an SVG file at specified position and size.
        Updates max dimensions tracking.
        """
        actual_file_path = self.svg_cache.find_svg_file(file_path)
        
        tree = etree.parse(actual_file_path)
        root = tree.getroot()
        
        # Set position and size attributes
        root.attrib["x"] = str(x)
        root.attrib["y"] = str(y)
        root.attrib["width"] = str(width)
        root.attrib["height"] = str(height)
        
        self.update_max_dimensions(x + width, y + height)
        return root
    
    def update_max_dimensions(self, x_val: float, y_val: float) -> None:
        """Update the maximum dimensions tracked."""
        if x_val > self.max_dimensions[0]:
            self.max_dimensions[0] = x_val
        if y_val > self.max_dimensions[1]:
            self.max_dimensions[1] = y_val
    
    def get_max_dimensions(self) -> Tuple[float, float]:
        """Get the current maximum dimensions."""
        return tuple(self.max_dimensions)
    
    def reset_max_dimensions(self) -> None:
        """Reset maximum dimensions tracking."""
        self.max_dimensions = [0, 0]


class MathParser:
    """Handles parsing and validation of mathematical operations."""
    
    OPERATIONS_LIST = ["addition", "subtraction", "multiplication", "division", "surplus", "unittrans", "area"]
    
    @staticmethod
    def get_priority(op_name: str) -> int:
        """Get numeric priority for an operation name."""
        if op_name in ("multiplication", "division"):
            return 2
        elif op_name in ("addition", "subtraction"):
            return 1
        else:
            return 0
    
    @staticmethod
    def can_skip_same_precedence(parent_op: str, child_op: str) -> bool:
        """Check if parentheses can be safely omitted for same precedence operations."""
        if parent_op == "addition" and child_op == "addition":
            return True
        if parent_op == "multiplication" and child_op == "multiplication":
            return True
        return False
    
    @staticmethod
    def is_int(value: Any) -> bool:
        """Check if a value can be converted to an integer."""
        try:
            float_value = float(value)
            return float_value.is_integer()
        except (ValueError, TypeError):
            return False


class LayoutCalculator:
    """Handles layout calculations for visual elements."""
    
    def __init__(self, constants: Dict[str, Any]):
        self.constants = constants
    
    def compute_box_size(self, entity: Dict[str, Any], layout: str, max_cols: int, max_rows: int, 
                        ref_box_width: float, ref_box_height: float, 
                        large_box_width: float, large_box_height: float) -> Tuple[float, float]:
        """Compute box size for an entity based on its layout."""
        if layout == "multiplier":
            return (self.constants["UNIT_SIZE"] * 2, ref_box_height)
        elif layout == "large":
            return (large_box_width, large_box_height)
        elif layout == "normal":
            normal_box_width = max_cols * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"]) + self.constants["BOX_PADDING"]
            normal_box_height = max_rows * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"]) + self.constants["BOX_PADDING"]
            return (normal_box_width, normal_box_height)
        elif layout == "row":
            cols = entity["cols"]
            w = cols * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"]) + self.constants["BOX_PADDING"]
            h = self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"] + self.constants["BOX_PADDING"]
            return (w, h)
        elif layout == "column":
            rows = entity["rows"]
            w = self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"] + self.constants["BOX_PADDING"]
            h = rows * (self.constants["ITEM_SIZE"] + self.constants["ITEM_PADDING"]) + self.constants["BOX_PADDING"]
            return (w, h)
        
        # Fallback
        return (ref_box_width, ref_box_height)


class ValidationError(Exception):
    """Custom exception for validation errors in visual generation."""
    pass


class VisualGenerationError(Exception):
    """Custom exception for visual generation errors."""
    pass