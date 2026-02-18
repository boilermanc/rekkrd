import React, { useState } from 'react';

interface SectionEditorProps {
  title: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onRevert: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  title,
  dirty,
  saving,
  onSave,
  onRevert,
  children,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      border: '1px solid rgb(229,231,235)',
      borderRadius: 8,
      background: 'white',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          color: 'rgb(17,24,39)',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          {dirty && (
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'rgb(245,158,11)',
            }} title="Unsaved changes" />
          )}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            color: 'rgb(156,163,175)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgb(229,231,235)' }}>
          <div style={{ paddingTop: 16 }}>
            {children}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onRevert}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid rgb(209,213,219)',
                background: 'white',
                color: 'rgb(107,114,128)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Revert to Default
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: saving ? 'rgb(165,180,252)' : 'rgb(99,102,241)',
                color: 'white',
                cursor: saving ? 'default' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {saving ? 'Saving...' : 'Save Section'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionEditor;
