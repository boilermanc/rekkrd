import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface CategoryItem {
  category: string;
  count: number;
}

interface TagItem {
  tag: string;
  count: number;
}

interface BlogFilterBarProps {
  categories: CategoryItem[];
  popularTags: TagItem[];
  activeCategory: string | null;
  activeTag: string | null;
  searchQuery: string;
  onCategoryChange: (category: string | null) => void;
  onTagChange: (tag: string | null) => void;
  onSearchChange: (query: string) => void;
}

function capitalizeCategory(cat: string): string {
  return cat
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}

const BlogFilterBar: React.FC<BlogFilterBarProps> = ({
  categories,
  popularTags,
  activeCategory,
  activeTag,
  searchQuery,
  onCategoryChange,
  onTagChange,
  onSearchChange,
}) => {
  const [inputValue, setInputValue] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external searchQuery → local input (e.g. when cleared externally)
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInputValue(value);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  }

  function handleClear() {
    setInputValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearchChange('');
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="blog-filter-bar" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: categories.length > 0 || popularTags.length > 0 ? '12px' : 0 }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Search articles..."
          aria-label="Search blog posts"
          style={{
            width: '100%',
            padding: '10px 36px 10px 36px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#e5e7eb',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {inputValue && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div
          role="radiogroup"
          aria-label="Filter by category"
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: popularTags.length > 0 ? '8px' : 0,
            marginBottom: popularTags.length > 0 ? '8px' : 0,
            scrollbarWidth: 'none',
          }}
        >
          {/* "All" chip */}
          <button
            aria-pressed={activeCategory === null}
            onClick={() => onCategoryChange(null)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              background: activeCategory === null ? '#E8927C' : 'rgba(255,255,255,0.1)',
              color: activeCategory === null ? '#fff' : '#d1d5db',
            }}
          >
            All
          </button>
          {categories.map(({ category, count }) => (
            <button
              key={category}
              aria-pressed={activeCategory === category}
              onClick={() => onCategoryChange(activeCategory === category ? null : category)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
                background: activeCategory === category ? '#E8927C' : 'rgba(255,255,255,0.1)',
                color: activeCategory === category ? '#fff' : '#d1d5db',
              }}
            >
              {capitalizeCategory(category)} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Popular tags */}
      {popularTags.length > 0 && (
        <div
          role="radiogroup"
          aria-label="Filter by tag"
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            flexWrap: 'wrap',
            scrollbarWidth: 'none',
          }}
        >
          {popularTags.map(({ tag }) => (
            <button
              key={tag}
              aria-pressed={activeTag === tag}
              onClick={() => onTagChange(activeTag === tag ? null : tag)}
              style={{
                flexShrink: 0,
                padding: '4px 10px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
                background: activeTag === tag ? '#64748b' : 'rgba(255,255,255,0.1)',
                color: activeTag === tag ? '#fff' : '#d1d5db',
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogFilterBar;
