import React, { useState } from 'react';
import { adminService } from '../../services/adminService';

interface BlogIdeaFormProps {
  onSubmitted: () => void;
}

const BlogIdeaForm: React.FC<BlogIdeaFormProps> = ({ onSubmitted }) => {
  const [idea, setIdea] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await adminService.submitBlogIdea({ idea: idea.trim(), tags });
      setIdea('');
      setTagsInput('');
      setMessage({ text: 'Idea submitted!', isError: false });
      onSubmitted();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to submit idea',
        isError: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-5 mb-6"
      style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'rgb(17,24,39)' }}>
        Quick Idea
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="e.g. Write about the best way to store vinyl records..."
            required
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm resize-y"
            style={{
              borderColor: 'rgb(209,213,219)',
              color: 'rgb(17,24,39)',
              backgroundColor: 'rgb(255,255,255)',
            }}
          />
        </div>
        <div>
          <input
            type="text"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="comma-separated, e.g. vinyl care, tips"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: 'rgb(209,213,219)',
              color: 'rgb(17,24,39)',
              backgroundColor: 'rgb(255,255,255)',
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !idea.trim()}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: 'rgb(99,102,241)' }}
          >
            {saving && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Submit Idea
          </button>
          {message && (
            <span
              className="text-sm"
              style={{ color: message.isError ? 'rgb(239,68,68)' : 'rgb(22,163,74)' }}
            >
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default BlogIdeaForm;
