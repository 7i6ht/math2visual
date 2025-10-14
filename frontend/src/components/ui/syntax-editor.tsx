import React, { useEffect, useRef, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { cn } from '@/lib/utils';
import './syntax-editor.css';

interface SyntaxEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
  height?: string;
  highlightRanges?: Array<[number, number]>;
  onCursorPositionChange?: (position: number, modelValue: string) => void;
}

// Define the Visual Language DSL grammar and syntax highlighting
const setupVLLanguage = (monaco: Monaco) => {
  // Register the custom language
  monaco.languages.register({ id: 'vl-dsl' });

  // Define the language configuration
  monaco.languages.setLanguageConfiguration('vl-dsl', {
    brackets: [
      ['(', ')'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
    ],
  });

  // Define the tokenization rules
  monaco.languages.setMonarchTokensProvider('vl-dsl', {
    tokenizer: {
      root: [
        // Whitespace (most common, handle first)
        [/\s+/, 'white'],
        
        // Delimiters (single character matches, very fast)
        [/[()]/, 'delimiter.parenthesis'],
        [/\[\]/, 'delimiter.bracket'],
        [/[,:]/, { cases: { ',': 'delimiter.comma', ':': 'delimiter.colon' } }],
        
        // Operations (grouped with word boundaries for efficiency)
        [/\b(?:addition|subtraction|multiplication|division|surplus|unittrans|area|comparison)\b/, 'keyword.operation'],
        
        // Container types (grouped pattern)
        [/\b(?:container\d+|result_container)\b/, 'keyword.container'],
        
        // Properties (grouped pattern with word boundaries)
        [/\b(?:entity_name|entity_type|entity_quantity|container_name|container_type|attr_name|attr_type)\b/, 'keyword.property'],
        
        // Numbers (optimized pattern)
        [/\d+(?:\.\d+)?/, 'number'],
        
        // Word characters (more efficient than single character matching)
        [/\w+/, 'string.value'],
        
        // Any other single character
        [/./, 'string.value'],
      ],
    },
  });

  // Define the theme with colors that match the design system
  monaco.editor.defineTheme('vl-theme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword.operation', foreground: '2563eb', fontStyle: 'bold' },      // blue-600 (echoes logo blue)
      { token: 'keyword.container', foreground: '7c3aed', fontStyle: 'bold' },      // violet-600
      { token: 'keyword.property', foreground: '1f2937', fontStyle: 'normal' },     // gray-800
      { token: 'number', foreground: '6b7280' },                                    // gray-500
      { token: 'string.value', foreground: '6b7280' },                              // gray-500
      { token: 'delimiter.bracket', foreground: '000000', fontStyle: 'normal' },    // black
      { token: 'delimiter.parenthesis', foreground: '000000', fontStyle: 'normal' }, // black
      { token: 'delimiter.comma', foreground: '000000' },                           // black
      { token: 'delimiter.colon', foreground: '000000' },                           // black
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#374151',
      'editor.lineHighlightBackground': '#f9fafb',
      'editor.selectionBackground': '#dbeafe',
      'editorLineNumber.foreground': '#9ca3af',
      'editorLineNumber.activeForeground': '#4b5563',
      // Force bracket colorization overlays to render as black
      'editorBracketHighlight.foreground1': '#000000',
      'editorBracketHighlight.foreground2': '#000000',
      'editorBracketHighlight.foreground3': '#000000',
      'editorBracketHighlight.foreground4': '#000000',
      'editorBracketHighlight.foreground5': '#000000',
      'editorBracketHighlight.foreground6': '#000000',
      'editorBracketHighlight.unexpectedBracket.foreground': '#000000',
      'editorBracketPairGuide.activeForeground': '#000000',
      'editorBracketPairGuide.foreground1': '#000000',
      'editorBracketPairGuide.foreground2': '#000000',
      'editorBracketPairGuide.foreground3': '#000000',
      'editorBracketPairGuide.foreground4': '#000000',
      'editorBracketPairGuide.foreground5': '#000000',
      'editorBracketPairGuide.foreground6': '#000000',
    },
  });

  // Define dark theme as well
  monaco.editor.defineTheme('vl-theme-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.operation', foreground: '60a5fa', fontStyle: 'bold' },     // blue-400 (bright blue for dark theme)
      { token: 'keyword.container', foreground: 'a78bfa', fontStyle: 'bold' },     // violet-400 (bright violet for dark theme)
      { token: 'keyword.property', foreground: 'e5e7eb', fontStyle: 'normal' },    // gray-200
      { token: 'number', foreground: '9ca3af' },                                   // gray-400
      { token: 'string.value', foreground: '9ca3af' },                             // gray-400
      { token: 'delimiter.bracket', foreground: 'ffffff', fontStyle: 'normal' },   // white
      { token: 'delimiter.parenthesis', foreground: 'ffffff', fontStyle: 'normal' }, // white
      { token: 'delimiter.comma', foreground: 'ffffff' },                          // white
      { token: 'delimiter.colon', foreground: 'ffffff' },                          // white
    ],
    colors: {
      'editor.background': '#1f2937',
      'editor.foreground': '#e5e7eb',
      'editor.lineHighlightBackground': '#374151',
      'editor.selectionBackground': '#3b82f680',
      'editorLineNumber.foreground': '#6b7280',
      'editorLineNumber.activeForeground': '#9ca3af',
      // Force bracket colorization overlays to render as white
      'editorBracketHighlight.foreground1': '#ffffff',
      'editorBracketHighlight.foreground2': '#ffffff',
      'editorBracketHighlight.foreground3': '#ffffff',
      'editorBracketHighlight.foreground4': '#ffffff',
      'editorBracketHighlight.foreground5': '#ffffff',
      'editorBracketHighlight.foreground6': '#ffffff',
      'editorBracketHighlight.unexpectedBracket.foreground': '#ffffff',
      'editorBracketPairGuide.activeForeground': '#ffffff',
      'editorBracketPairGuide.foreground1': '#ffffff',
      'editorBracketPairGuide.foreground2': '#ffffff',
      'editorBracketPairGuide.foreground3': '#ffffff',
      'editorBracketPairGuide.foreground4': '#ffffff',
      'editorBracketPairGuide.foreground5': '#ffffff',
      'editorBracketPairGuide.foreground6': '#ffffff',
    },
  });
};

export const SyntaxEditor: React.FC<SyntaxEditorProps> = ({
  value,
  onChange,
  className,
  rows = 6,
  height,
  highlightRanges = [],
  onCursorPositionChange,
}) => {
  const isLanguageSetup = useRef(false);
  const [formattedValue, setFormattedValue] = useState(value);
  const [dynamicHeight, setDynamicHeight] = useState<string>('');
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const monacoRef = useRef<Monaco | null>(null);
  
  // Calculate responsive font size based on container width
  const getResponsiveFontSize = () => {
    const container = document.querySelector('.dsl-editor-container');
    if (!container) return 18;
    
    const width = container.clientWidth;
    if (width >= 1200) return 24;
    if (width >= 1100) return 23;
    if (width >= 1000) return 22;
    if (width >= 900) return 21;
    if (width >= 800) return 20;
    if (width >= 700) return 19;
    if (width >= 600) return 18;
    if (width >= 500) return 17;
    if (width >= 400) return 16;
    if (width >= 300) return 15;
    return 14;
  };

  // Calculate dynamic height based on content
  const calculateDynamicHeight = (content: string) => {
    if (!content.trim()) {
      return `${rows * 24}px`; // Default height for empty content
    }

    const lines = content.split('\n').length;
    const fontSize = getResponsiveFontSize();
    const lineHeight = fontSize * 1.3; // More accurate line height based on font size
    const padding = 16; // Account for editor padding and borders
    const minHeight = 120; // Minimum height for usability
    
    // Calculate base height needed for content
    const contentHeight = lines * lineHeight + padding;
    
    // For single-column layout, use more of the available space
    const isSingleColumn = window.innerHeight >= 1200;
    const maxHeight = isSingleColumn 
      ? Math.min(window.innerHeight * 0.75, 1000) // Use up to 75% of viewport in single-column
      : Math.min(window.innerHeight * 0.6, 600);  // Use up to 60% in two-column
    
    // If content is short, allow it to grow to use more space
    const targetHeight = contentHeight < 300 
      ? Math.min(contentHeight * 1.5, maxHeight) // Allow short content to use more space
      : Math.min(contentHeight, maxHeight);      // Longer content uses what it needs
    
    const calculatedHeight = Math.max(minHeight, targetHeight);
    
    console.log('Height calculation:', {
      lines,
      fontSize,
      lineHeight,
      contentHeight,
      isSingleColumn,
      maxHeight,
      calculatedHeight: `${calculatedHeight}px`,
      viewportHeight: window.innerHeight
    });
    return `${calculatedHeight}px`;
  };

  // Update formatted value when value changes externally (no formatting needed since backend sends formatted DSL)
  useEffect(() => {
    if (value !== formattedValue) {
      setFormattedValue(value || '');
    }
  }, [value, formattedValue]);

  // Update dynamic height when content changes
  useEffect(() => {
    const newHeight = calculateDynamicHeight(formattedValue);
    console.log('DSL Height calculation:', {
      content: formattedValue.substring(0, 100) + '...',
      lines: formattedValue.split('\n').length,
      calculatedHeight: newHeight
    });
    setDynamicHeight(newHeight);
  }, [formattedValue, rows]);

  // Recalculate height when layout changes (window resize)
  useEffect(() => {
    const handleResize = () => {
      if (formattedValue) {
        const newHeight = calculateDynamicHeight(formattedValue);
        setDynamicHeight(newHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [formattedValue]);


  // Update font size when container resizes
  useEffect(() => {
    const updateFontSize = () => {
      if (editorRef.current) {
        const newFontSize = getResponsiveFontSize();
        editorRef.current.updateOptions({ fontSize: newFontSize });
      }
    };

    // Initial font size update
    updateFontSize();

    // Set up resize observer
    const container = document.querySelector('.dsl-editor-container');
    if (container) {
      const resizeObserver = new ResizeObserver(() => {
        updateFontSize();
      });
      resizeObserver.observe(container);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  const handleEditorDidMount = (
    editor: MonacoEditor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    if (!isLanguageSetup.current) {
      setupVLLanguage(monaco);
      isLanguageSetup.current = true;
    }

    // Set the theme based on system preference or default to light
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    monaco.editor.setTheme(isDark ? 'vl-theme-dark' : 'vl-theme');
    
    // Simple height recalculation after editor is mounted
    setTimeout(() => {
      if (formattedValue) {
        const newHeight = calculateDynamicHeight(formattedValue);
        setDynamicHeight(newHeight);
      }
    }, 100);
    
    // Handle cursor position changes
    // Note: We're not automatically triggering highlighting here to avoid infinite loops
    // Highlighting will happen when users interact with visual elements
    if (onCursorPositionChange) {
      editor.onDidChangeCursorPosition((e: MonacoEditor.ICursorPositionChangedEvent) => {
        const model = editor.getModel();
        if (model) {
          const offset = model.getOffsetAt(e.position);
          const modelValue = model.getValue();
          
          // Provide the current model value to consumers
          onCursorPositionChange(offset, modelValue);
        }
      });
    }
  };
  
  // Add highlighting functionality
  useEffect(() => {
    if (editorRef.current && highlightRanges.length > 0) {
      const monaco = monacoRef.current;
      if (!monaco) return;
      
      const model = editorRef.current.getModel();
      if (!model) return;
      
      // Clear previous decorations
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );
      
      // Add new decorations
      const newDecorations = highlightRanges.map(([start, end]) => {
        const startPos = model.getPositionAt(start);
        const endPos = model.getPositionAt(end);
        
        return {
          range: new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column
          ),
          options: {
            className: 'highlighted-dsl-range',
            inlineClassName: 'highlighted-dsl-inline',
            hoverMessage: { value: 'Component is highlighted in visual' },
          },
        };
      });
      
      decorationsRef.current = editorRef.current.deltaDecorations(
        [],
        newDecorations
      );
      
      // Auto-scroll to the first highlighted range to make it visible
      if (newDecorations.length > 0) {
        const firstRange = newDecorations[0].range;
        editorRef.current.revealRangeInCenter(firstRange, 1); // 1 = Smooth scrolling
      }
    } else if (editorRef.current && highlightRanges.length === 0) {
      // Clear all decorations when no ranges to highlight
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );
    }
  }, [highlightRanges]);


  return (
    <div className={cn("dsl-editor-container border rounded-md overflow-hidden", className)}>
      <Editor
        height={height || dynamicHeight || `${rows * 20}px`}
        language="vl-dsl"
        value={formattedValue}
        onChange={(newValue) => {
          const updatedValue = newValue || '';
          setFormattedValue(updatedValue);
          onChange(updatedValue);
        }}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: getResponsiveFontSize(),
          lineNumbers: 'off',
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 0,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
          },
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          renderLineHighlight: 'line',
          cursorBlinking: 'blink',
          automaticLayout: true,
          fixedOverflowWidgets: true,
          selectOnLineNumbers: true,
          renderWhitespace: 'none',
          contextmenu: true,
          links: false,
          colorDecorators: false,
          quickSuggestions: false,
          parameterHints: { enabled: false },
          hover: { enabled: false },
          codeLens: false,
          renderControlCharacters: false,
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        }}
      />
    </div>
  );
};
