import React, { useState, useEffect, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface SafeWysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

// Error boundary component
class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WYSIWYG Editor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Simple fallback textarea editor
const FallbackEditor: React.FC<SafeWysiwygEditorProps> = ({
  value,
  onChange,
  placeholder,
  height = '500px'
}) => {
  // Convert HTML to plain text for fallback
  const textValue = value.replace(/<[^>]*>/g, '');
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Convert line breaks to <p> tags for basic HTML
    const htmlValue = e.target.value
      .split('\n\n')
      .map(paragraph => paragraph.trim() ? `<p>${paragraph}</p>` : '')
      .join('\n');
    onChange(htmlValue);
  };

  return (
    <div className="fallback-editor">
      <div className="editor-notice" style={{
        background: '#fef3cd',
        border: '1px solid #fbbf24',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem 0.5rem 0 0',
        fontSize: '0.875rem',
        color: '#92400e'
      }}>
        ⚠️ Editor avançado indisponível. Usando editor simples.
      </div>
      <textarea
        value={textValue}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: height,
          padding: '1rem',
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          borderRadius: '0 0 0.5rem 0.5rem',
          fontFamily: 'inherit',
          fontSize: '16px',
          resize: 'vertical',
          outline: 'none'
        }}
      />
    </div>
  );
};

// Dynamic import of the advanced editor (primary) and basic editor (fallback)
const DynamicAdvancedEditor = React.lazy(() => 
  import('./SimpleTiptapEditor').then(module => ({ default: module.SimpleTiptapEditor }))
);

// Removed React Quill editor due to React 19 compatibility issues
// const DynamicWysiwygEditor = React.lazy(() => 
//   import('./WysiwygEditor').then(module => ({ default: module.WysiwygEditor }))
// );

export const SafeWysiwygEditor: React.FC<SafeWysiwygEditorProps> = (props) => {
  const [editorType, setEditorType] = useState<'advanced' | 'fallback'>('advanced');

  const EditorComponent = () => {
    switch (editorType) {
      case 'advanced':
        return (
          <EditorErrorBoundary
            fallback={
              <div className="editor-error" style={{
                background: '#fef3cd',
                border: '1px solid #fbbf24',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                <p style={{ margin: 0, color: '#92400e' }}>
                  ⚠️ Editor avançado não disponível. 
                  <button 
                    onClick={() => setEditorType('fallback')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#92400e',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      marginLeft: '0.5rem'
                    }}
                  >
                    Usar editor simples
                  </button>
                </p>
              </div>
            }
          >
            <DynamicAdvancedEditor {...props} />
          </EditorErrorBoundary>
        );
      
      default:
        return <FallbackEditor {...props} />;
    }
  };

  return (
    <div className="safe-editor-container">
      {/* Editor type selector */}
      <div className="editor-selector" style={{
        marginBottom: '1rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Editor:</span>
        <button
          onClick={() => setEditorType('advanced')}
          style={{
            padding: '0.25rem 0.75rem',
            fontSize: '0.875rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            background: editorType === 'advanced' ? '#E10600' : 'white',
            color: editorType === 'advanced' ? 'white' : '#374151',
            cursor: 'pointer'
          }}
        >
          Avançado (Tiptap)
        </button>
        <button
          onClick={() => setEditorType('fallback')}
          style={{
            padding: '0.25rem 0.75rem',
            fontSize: '0.875rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            background: editorType === 'fallback' ? '#E10600' : 'white',
            color: editorType === 'fallback' ? 'white' : '#374151',
            cursor: 'pointer'
          }}
        >
          Simples
        </button>
      </div>

      <Suspense fallback={
        <div className="editor-loading" style={{ 
          height: props.height || '500px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          background: '#f9fafb'
        }}>
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Carregando editor avançado...</span>
        </div>
      }>
        <EditorComponent />
      </Suspense>
    </div>
  );
};