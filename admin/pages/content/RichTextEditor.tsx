import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const btnStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid rgb(209,213,219)',
  background: active ? 'rgb(238,242,255)' : 'white',
  color: active ? 'rgb(99,102,241)' : 'rgb(55,65,81)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  lineHeight: 1,
});

const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  label: string;
}> = ({ onClick, active = false, label }) => (
  <button
    type="button"
    onClick={onClick}
    style={btnStyle(active)}
    title={label}
  >
    {label}
  </button>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div style={{ border: '1px solid rgb(209,213,219)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        padding: '8px 10px',
        borderBottom: '1px solid rgb(209,213,219)',
        background: 'rgb(249,250,251)',
      }}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          label="B"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          label="I"
        />
        <span style={{ width: 1, background: 'rgb(209,213,219)', margin: '0 2px' }} />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          label="H2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          label="H3"
        />
        <span style={{ width: 1, background: 'rgb(209,213,219)', margin: '0 2px' }} />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          label="UL"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          label="OL"
        />
        <span style={{ width: 1, background: 'rgb(209,213,219)', margin: '0 2px' }} />
        <ToolbarButton
          onClick={addLink}
          active={editor.isActive('link')}
          label="Link"
        />
        {editor.isActive('link') && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            label="Unlink"
          />
        )}
        <span style={{ width: 1, background: 'rgb(209,213,219)', margin: '0 2px' }} />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Undo" />
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Redo" />
      </div>
      <EditorContent
        editor={editor}
        style={{
          padding: '16px 20px',
          minHeight: 400,
          fontSize: 14,
          lineHeight: 1.7,
          color: 'rgb(17,24,39)',
        }}
      />
    </div>
  );
};

export default RichTextEditor;
