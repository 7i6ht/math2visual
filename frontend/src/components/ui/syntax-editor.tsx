import React, { useEffect, useRef, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { DSLFormatter } from '@/utils/dsl-formatter';

interface SyntaxEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
  height?: string;
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
        [/[\[\]]/, 'delimiter.bracket'],
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
}) => {
  const isLanguageSetup = useRef(false);
  const [formattedValue, setFormattedValue] = useState(value);
  const isFormattingRef = useRef(false);

  // Auto-format when value changes externally (e.g., from API)
  useEffect(() => {
    if (value && value !== formattedValue && !isFormattingRef.current) {
      const formatted = DSLFormatter.format(value);
      if (formatted !== value) {
        isFormattingRef.current = true;
        setFormattedValue(formatted);
        onChange(formatted);
        setTimeout(() => {
          isFormattingRef.current = false;
        }, 100);
      } else {
        setFormattedValue(value);
      }
    } else if (!value) {
      setFormattedValue('');
    }
  }, [value, formattedValue, onChange]);

  const handleEditorDidMount = (_editor: any, monaco: Monaco) => {
    if (!isLanguageSetup.current) {
      setupVLLanguage(monaco);
      isLanguageSetup.current = true;
    }

    // Set the theme based on system preference or default to light
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    monaco.editor.setTheme(isDark ? 'vl-theme-dark' : 'vl-theme');
  };

  return (
    <div className={cn("border rounded-md overflow-hidden h-full", className)}>
      <Editor
        height={height || `${rows * 24}px`}
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
          fontSize: 14,
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
