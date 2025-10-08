"""
Utility module for cleaning up temporary files and managing storage.
"""
import os
import time
import glob
from typing import Optional


class FileCleanupManager:
    """
    Manages cleanup of temporary files based on age and patterns.
    """
    
    def __init__(self, 
        output_dir: str, 
        max_age_hours: int = 24,
        cleanup_patterns: Optional[list] = None,
        include_archives: bool = False):
        """
        Initialize cleanup manager.
        
        Args:
            output_dir: Directory to clean up
            max_age_hours: Maximum age of files before cleanup (default: 24 hours)
            cleanup_patterns: File patterns to clean up (default: common temp patterns)
            include_archives: Whether to include archive files in cleanup (default: False)
        """
        self.output_dir = output_dir
        self.max_age_seconds = max_age_hours * 3600
        
        if cleanup_patterns is None:
            # Default patterns for temporary files (UUID-based names)
            self.cleanup_patterns = [
                "formal_*-*-*-*-*.svg",    # Temporary formal files (formal_{uuid}.svg) - UUID has 4 hyphens
                "intuitive_*-*-*-*-*.svg", # Temporary intuitive files (intuitive_{uuid}.svg) - UUID has 4 hyphens
            ]
            
            # Add archive patterns only if requested (timestamp-based names)
            if include_archives:
                self.cleanup_patterns.extend([
                    "formal_*_*-*-*-*-*.svg",    # Archive formal files (formal_{timestamp}_{uuid}.svg)
                    "intuitive_*_*-*-*-*-*.svg", # Archive intuitive files (intuitive_{timestamp}_{uuid}.svg)
                ])
        else:
            self.cleanup_patterns = cleanup_patterns
    
    def get_file_age_seconds(self, filepath: str) -> Optional[float]:
        """
        Get the age of a file in seconds.
        
        Args:
            filepath: Path to the file
            
        Returns:
            Age in seconds, or None if file doesn't exist or can't be accessed
        """
        try:
            if not os.path.exists(filepath):
                return None
            
            file_time = os.path.getmtime(filepath)
            current_time = time.time()
            return current_time - file_time
        except (OSError, IOError):
            return None
    
    def should_cleanup_file(self, filepath: str) -> bool:
        """
        Determine if a file should be cleaned up based on age.
        
        Args:
            filepath: Path to the file
            
        Returns:
            True if file should be cleaned up, False otherwise
        """
        age = self.get_file_age_seconds(filepath)
        if age is None:
            return False
        
        return age > self.max_age_seconds
    
    def cleanup_old_files(self) -> dict:
        """
        Clean up old temporary files matching the configured patterns.
        
        Returns:
            Dictionary with cleanup statistics
        """
        stats = {
            "files_found": 0,
            "files_cleaned": 0,
            "errors": 0,
            "cleaned_files": []
        }
        
        if not os.path.exists(self.output_dir):
            return stats
        
        for pattern in self.cleanup_patterns:
            # Search for files matching the pattern
            search_pattern = os.path.join(self.output_dir, pattern)
            matching_files = glob.glob(search_pattern)
            stats["files_found"] = len(matching_files)
            
            for filepath in matching_files:
                try:
                    if self.should_cleanup_file(filepath):
                        os.remove(filepath)
                        stats["files_cleaned"] += 1
                        stats["cleaned_files"].append(filepath)
                        print(f"Cleaned up old file: {filepath}")
                except (OSError, IOError) as e:
                    stats["errors"] += 1
                    print(f"Error cleaning up file {filepath}: {e}")
        
        return stats
    
    def get_storage_stats(self) -> dict:
        """
        Get statistics about storage usage in the output directory.
        
        Returns:
            Dictionary with storage statistics
        """
        stats = {
            "total_files": 0,
            "total_size_bytes": 0,
            "old_files": 0,
            "old_size_bytes": 0
        }
        
        if not os.path.exists(self.output_dir):
            return stats
        
        try:
            for filename in os.listdir(self.output_dir):
                filepath = os.path.join(self.output_dir, filename)
                
                if os.path.isfile(filepath):
                    file_size = os.path.getsize(filepath)
                    stats["total_files"] += 1
                    stats["total_size_bytes"] += file_size
                    
                    # Check if file is old
                    if self.should_cleanup_file(filepath):
                        stats["old_files"] += 1
                        stats["old_size_bytes"] += file_size
        
        except (OSError, IOError) as e:
            print(f"Error getting storage stats: {e}")
        
        return stats


def cleanup_temp_files(output_dir: str, max_age_hours: int = 24) -> dict:
    """
    Convenience function to clean up temporary files.
    
    Args:
        output_dir: Directory to clean up
        max_age_hours: Maximum age of files before cleanup
        
    Returns:
        Cleanup statistics
    """
    manager = FileCleanupManager(output_dir, max_age_hours)
    return manager.cleanup_old_files()


def get_storage_stats(output_dir: str, max_age_hours: int = 24) -> dict:
    """
    Convenience function to get storage statistics.
    
    Args:
        output_dir: Directory to analyze
        max_age_hours: Age threshold for considering files "old"
        
    Returns:
        Storage statistics
    """
    manager = FileCleanupManager(output_dir, max_age_hours)
    return manager.get_storage_stats()
