import React, { useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image as ImageIcon, Link as LinkIcon,
  Undo, Redo, Code
} from 'lucide-react';

interface SimpleTiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string | number;
}

export const SimpleTiptapEditor: React.FC<SimpleTiptapEditorProps> = ({
  value,
  onChange,
  placeholder = 'Comece a escrever...',
  height = 500
}) => {
  // Debounced onChange to improve performance
  const debouncedOnChange = useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return (content: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onChange(content);
        }, 300); // 300ms debounce
      };
    }, [onChange]),
    [onChange]
  );

  const editorExtensions = useMemo(() => [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-red-600 underline',
      },
    }),
    Underline,
  ], []);

  const editor = useEditor({
    extensions: editorExtensions,
    content: value,
    onUpdate: ({ editor }) => {
      debouncedOnChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        style: `min-height: ${typeof height === 'number' ? height + 'px' : height}; padding: 1rem;`,
      },
      // Allow all HTML attributes to be preserved
      parseOptions: {
        preserveWhitespace: 'full',
      },
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('URL da imagem:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do link:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertTemplate = (template: string) => {
    if (!editor) return;
    
    let content = '';
    
    switch (template) {
      case 'pros-cons':
        content = `
<table class="pros-cons-table" style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" data-preserve-html="true">
  <thead>
    <tr>
      <th style="background-color: #d4edda; color: #155724; padding: 15px 12px; border: 1px solid #c3e6cb; text-align: center; font-weight: 600; font-size: 16px;">
        ✅ Vantagens
      </th>
      <th style="background-color: #f8d7da; color: #721c24; padding: 15px 12px; border: 1px solid #f5c6cb; text-align: center; font-weight: 600; font-size: 16px;">
        ❌ Desvantagens
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 15px 12px; border: 1px solid #ddd; vertical-align: top; line-height: 1.6; background-color: #f8f9fa;">
        • Vantagem 1<br>
        • Vantagem 2<br>
        • Vantagem 3
      </td>
      <td style="padding: 15px 12px; border: 1px solid #ddd; vertical-align: top; line-height: 1.6; background-color: #f8f9fa;">
        • Desvantagem 1<br>
        • Desvantagem 2
      </td>
    </tr>
  </tbody>
</table>`;
        break;
      case 'cta':
        content = `
<div style="text-align: center; margin: 20px 0;" data-preserve-html="true">
  <a href="#" 
     target="_blank" 
     rel="nofollow noopener"
     style="display: inline-block; 
            background-color: #dc3545; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            font-size: 16px; 
            border: none; 
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
            transition: all 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
     onmouseover="this.style.backgroundColor='#c82333'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(220, 53, 69, 0.4)';"
     onmouseout="this.style.backgroundColor='#dc3545'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(220, 53, 69, 0.3)';"
     data-preserve-html="true">
    VER OFERTA AGORA
  </a>
</div>`;
        break;
    }
    
    if (content) {
      editor.chain().focus().insertContent(content).run();
    }
  };

  return (
    <div className="simple-tiptap-editor">
      <style jsx global>{`
        .simple-tiptap-editor {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .simple-tiptap-toolbar {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
        }
        
        .simple-tiptap-toolbar button {
          padding: 6px 8px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .simple-tiptap-toolbar button:hover {
          background: #e5e7eb;
        }
        
        .simple-tiptap-toolbar button.is-active {
          background: #E10600;
          color: white;
          border-color: #E10600;
        }
        
        .simple-tiptap-toolbar .divider {
          width: 1px;
          height: 24px;
          background: #e5e7eb;
          margin: 0 4px;
        }
        
        .simple-tiptap-toolbar select {
          padding: 4px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          background: white;
          font-size: 14px;
        }
        
        .ProseMirror {
          background: white;
          color: #333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          font-size: 16px;
          line-height: 1.6;
        }
        
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3,
        .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
          color: #2c3e50;
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror h1 { font-size: 2.5em; }
        .ProseMirror h2 { font-size: 2em; }
        .ProseMirror h3 { font-size: 1.5em; }
        .ProseMirror h4 { font-size: 1.25em; }
        
        .ProseMirror p {
          margin: 1em 0;
        }
        
        .ProseMirror a {
          color: #E10600;
          text-decoration: none;
        }
        
        .ProseMirror a:hover {
          text-decoration: underline;
        }
        
        .ProseMirror blockquote {
          border-left: 4px solid #E10600;
          margin: 1.5em 0;
          padding: 0.5em 0 0.5em 1em;
          color: #666;
          font-style: italic;
        }
        
        .ProseMirror pre {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 1em;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        /* Preserve styling for complex HTML structures */
        .ProseMirror table.pros-cons-table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 20px 0 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        
        .ProseMirror table.pros-cons-table th,
        .ProseMirror table.pros-cons-table td {
          padding: 15px 12px !important;
          border: 1px solid #ddd !important;
          vertical-align: top !important;
          line-height: 1.6 !important;
        }
        
        .ProseMirror a[data-preserve-html="true"] {
          display: inline-block !important;
          background-color: #dc3545 !important;
          color: white !important;
          padding: 12px 24px !important;
          text-decoration: none !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          font-size: 16px !important;
          border: none !important;
          cursor: pointer !important;
          box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3) !important;
          transition: all 0.3s ease !important;
        }
      `}</style>
      
      {/* Toolbar */}
      <div className="simple-tiptap-toolbar">
        {/* Undo/Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Desfazer"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Refazer"
        >
          <Redo size={16} />
        </button>
        
        <div className="divider" />
        
        {/* Headings */}
        <select
          value=""
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level) {
              editor.chain().focus().toggleHeading({ level: level as any }).run();
            } else {
              editor.chain().focus().setParagraph().run();
            }
          }}
        >
          <option value="">Parágrafo</option>
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="3">Título 3</option>
          <option value="4">Título 4</option>
        </select>
        
        <div className="divider" />
        
        {/* Text formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Negrito"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Itálico"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="Sublinhado"
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="Riscado"
        >
          <Strikethrough size={16} />
        </button>
        
        <div className="divider" />
        
        {/* Alignment */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
          title="Alinhar à esquerda"
        >
          <AlignLeft size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
          title="Centralizar"
        >
          <AlignCenter size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
          title="Alinhar à direita"
        >
          <AlignRight size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
          title="Justificar"
        >
          <AlignJustify size={16} />
        </button>
        
        <div className="divider" />
        
        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Lista com marcadores"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="Lista numerada"
        >
          <ListOrdered size={16} />
        </button>
        
        <div className="divider" />
        
        {/* Media */}
        <button onClick={addImage} title="Inserir imagem">
          <ImageIcon size={16} />
        </button>
        <button onClick={setLink} title="Inserir link">
          <LinkIcon size={16} />
        </button>
        
        <div className="divider" />
        
        {/* Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          title="Citação"
        >
          <Quote size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          title="Bloco de código"
        >
          <Code size={16} />
        </button>
        
        <div className="divider" />
        
        {/* Templates */}
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              insertTemplate(e.target.value);
              e.target.value = '';
            }
          }}
        >
          <option value="">Templates</option>
          <option value="pros-cons">Prós e Contras</option>
          <option value="cta">Call to Action</option>
        </select>
      </div>
      
      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        style={{ 
          minHeight: typeof height === 'number' ? `${height}px` : height 
        }} 
      />
    </div>
  );
};