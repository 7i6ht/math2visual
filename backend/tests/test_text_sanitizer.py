"""
Tests for text sanitization functionality
"""

import unittest
from app.services.validation.text_sanitizer import sanitize_tutor_message


class TestTextSanitizer(unittest.TestCase):
    """Test cases for text sanitization"""

    def test_sanitize_tutor_message(self):
        """Test tutor message sanitization"""
        # Test that HTML is stripped from tutor messages
        input_text = "This is a <script>bad</script> message with <strong>formatting</strong>"
        result = sanitize_tutor_message(input_text)
        expected = "This is a  message with formatting"
        self.assertEqual(result, expected)

        # Test normal text passes through
        input_text = "This is a normal tutor message"
        result = sanitize_tutor_message(input_text)
        self.assertEqual(result, input_text)

    def test_empty_and_none_input(self):
        """Test handling of empty and None inputs"""
        # Test empty string
        result = sanitize_tutor_message("")
        self.assertEqual(result, "")

        # Test None (should return None)
        result = sanitize_tutor_message(None)
        self.assertIsNone(result)

    def test_xss_prevention(self):
        """Test XSS prevention"""
        xss_vectors = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "<iframe src='javascript:alert(\"xss\")'></iframe>",
            "<a href='javascript:alert(\"xss\")'>click me</a>",
            "<div onmouseover=alert('xss')>hover me</div>",
        ]

        for vector in xss_vectors:
            with self.subTest(vector=vector):
                result = sanitize_tutor_message(f"Hello {vector} world")
                # Should strip all HTML tags
                self.assertNotIn("<", result)
                self.assertNotIn(">", result)
                self.assertIn("Hello", result)
                self.assertIn("world", result)


if __name__ == '__main__':
    unittest.main()