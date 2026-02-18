import React from 'react';
import type {
  CmsHero,
  CmsProofStat,
  CmsSectionHeader,
  CmsFeature,
  CmsStep,
  CmsShowcase,
  CmsShowcaseCard,
  CmsPlaylistHeader,
  CmsPlaylistTrack,
  CmsStatItem,
  CmsTestimonial,
  CmsFaq,
  CmsFinalCta,
  CmsFooter,
} from '../../../types/cms';

// ── Shared styles ──

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid rgb(209,213,219)',
  fontSize: 13,
  color: 'rgb(17,24,39)',
  background: 'white',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 60,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'rgb(107,114,128)',
  marginBottom: 4,
};

const fieldGroup: React.CSSProperties = { marginBottom: 12 };

const repeatCard: React.CSSProperties = {
  padding: 12,
  border: '1px solid rgb(229,231,235)',
  borderRadius: 6,
  background: 'rgb(249,250,251)',
  marginBottom: 8,
};

const repeatLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgb(156,163,175)',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

// ── Hero ──

export const HeroEditor: React.FC<{
  value: CmsHero;
  onChange: (v: CmsHero) => void;
}> = ({ value, onChange }) => {
  const set = (field: keyof CmsHero, v: string) => onChange({ ...value, [field]: v });
  return (
    <>
      <div style={fieldGroup}>
        <label style={labelStyle}>Badge Text</label>
        <input style={inputStyle} value={value.badge} onChange={e => set('badge', e.target.value)} />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle}>Heading (use \n for line break)</label>
        <textarea style={textareaStyle} value={value.heading} onChange={e => set('heading', e.target.value)} />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle}>Subheading</label>
        <textarea style={textareaStyle} value={value.subheading} onChange={e => set('subheading', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Primary CTA</label>
          <input style={inputStyle} value={value.cta_primary} onChange={e => set('cta_primary', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Secondary CTA</label>
          <input style={inputStyle} value={value.cta_secondary} onChange={e => set('cta_secondary', e.target.value)} />
        </div>
      </div>
    </>
  );
};

// ── Proof Stats ──

export const ProofStatsEditor: React.FC<{
  value: CmsProofStat[];
  onChange: (v: CmsProofStat[]) => void;
}> = ({ value, onChange }) => {
  const update = (i: number, field: keyof CmsProofStat, v: string) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [field]: v };
    onChange(copy);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {value.map((stat, i) => (
        <div key={i} style={repeatCard}>
          <div style={repeatLabel}>Stat {i + 1}</div>
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Value</label>
            <input style={inputStyle} value={stat.value} onChange={e => update(i, 'value', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Label</label>
            <input style={inputStyle} value={stat.label} onChange={e => update(i, 'label', e.target.value)} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Section Header ──

export const SectionHeaderEditor: React.FC<{
  value: CmsSectionHeader;
  onChange: (v: CmsSectionHeader) => void;
}> = ({ value, onChange }) => {
  const set = (field: keyof CmsSectionHeader, v: string) => onChange({ ...value, [field]: v });
  return (
    <>
      <div style={fieldGroup}>
        <label style={labelStyle}>Section Label</label>
        <input style={inputStyle} value={value.label} onChange={e => set('label', e.target.value)} />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle}>Title</label>
        <input style={inputStyle} value={value.title} onChange={e => set('title', e.target.value)} />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle}>Subtitle</label>
        <textarea style={textareaStyle} value={value.subtitle} onChange={e => set('subtitle', e.target.value)} />
      </div>
    </>
  );
};

// ── Features ──

export const FeaturesEditor: React.FC<{
  value: CmsFeature[];
  onChange: (v: CmsFeature[]) => void;
}> = ({ value, onChange }) => {
  const update = (i: number, field: keyof CmsFeature, v: string) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [field]: v };
    onChange(copy);
  };
  return (
    <>
      {value.map((f, i) => (
        <div key={i} style={repeatCard}>
          <div style={repeatLabel}>Feature {i + 1}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>Icon</label>
              <input style={inputStyle} value={f.icon} onChange={e => update(i, 'icon', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>CSS Class</label>
              <input style={inputStyle} value={f.cls} onChange={e => update(i, 'cls', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={f.title} onChange={e => update(i, 'title', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={textareaStyle} value={f.desc} onChange={e => update(i, 'desc', e.target.value)} />
          </div>
        </div>
      ))}
    </>
  );
};

// ── Steps (How It Works) ──

export const StepsEditor: React.FC<{
  value: CmsStep[];
  onChange: (v: CmsStep[]) => void;
}> = ({ value, onChange }) => {
  const update = (i: number, field: keyof CmsStep, v: string) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [field]: v };
    onChange(copy);
  };
  return (
    <>
      {value.map((s, i) => (
        <div key={i} style={repeatCard}>
          <div style={repeatLabel}>Step {s.num}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>Num</label>
              <input style={inputStyle} value={s.num} onChange={e => update(i, 'num', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={s.title} onChange={e => update(i, 'title', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={textareaStyle} value={s.desc} onChange={e => update(i, 'desc', e.target.value)} />
          </div>
        </div>
      ))}
    </>
  );
};

// ── Showcase ──

export const ShowcaseEditor: React.FC<{
  value: CmsShowcase;
  onChange: (v: CmsShowcase) => void;
}> = ({ value, onChange }) => {
  const set = (field: keyof CmsShowcase, v: string | string[]) => onChange({ ...value, [field]: v });
  const updateChecklist = (i: number, v: string) => {
    const copy = [...value.checklist];
    copy[i] = v;
    set('checklist', copy);
  };
  return (
    <>
      <div style={fieldGroup}>
        <label style={labelStyle}>Section Label</label>
        <input style={inputStyle} value={value.label} onChange={e => set('label', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={value.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Title Emphasis</label>
          <input style={inputStyle} value={value.title_em} onChange={e => set('title_em', e.target.value)} />
        </div>
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle}>Subtitle</label>
        <textarea style={textareaStyle} value={value.subtitle} onChange={e => set('subtitle', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>Checklist Items</label>
        {value.checklist.map((item, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <input style={inputStyle} value={item} onChange={e => updateChecklist(i, e.target.value)} />
          </div>
        ))}
      </div>
    </>
  );
};

// ── Showcase Cards ──

export const ShowcaseCardsEditor: React.FC<{
  value: CmsShowcaseCard[];
  onChange: (v: CmsShowcaseCard[]) => void;
}> = ({ value, onChange }) => {
  const update = (i: number, field: keyof CmsShowcaseCard, v: string) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [field]: v };
    onChange(copy);
  };
  return (
    <>
      {value.map((c, i) => (
        <div key={i} style={repeatCard}>
          <div style={repeatLabel}>Card {i + 1}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 100px', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>Emoji</label>
              <input style={inputStyle} value={c.emoji} onChange={e => update(i, 'emoji', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={c.title} onChange={e => update(i, 'title', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Artist</label>
              <input style={inputStyle} value={c.artist} onChange={e => update(i, 'artist', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Price</label>
              <input style={inputStyle} value={c.price} onChange={e => update(i, 'price', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Gradient (CSS)</label>
            <input style={inputStyle} value={c.gradient} onChange={e => update(i, 'gradient', e.target.value)} />
          </div>
        </div>
      ))}
    </>
  );
};

// ── Playlist Header ──

export const PlaylistHeaderEditor: React.FC<{
  value: CmsPlaylistHeader;
  onChange: (v: CmsPlaylistHeader) => void;
}> = ({ value, onChange }) => {
  const set = (field: keyof CmsPlaylistHeader, v: string | string[]) => onChange({ ...value, [field]: v });
  const updateChecklist = (i: number, v: string) => {
    const copy = [...value.checklist];
    copy[i] = v;
    set('checklist', copy);
  };
  return (
    <>
      <div style={fieldGroup}>
        <label style={labelStyle}>Section Label</label>
        <input style={inputStyle} value={value.label} onChange={e => set('label', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={value.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Title Emphasis</label>
          <input style={inputStyle} value={value.title_em} onChange={e => set('title_em', e.target.value)} />
        </div>
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle}>Subtitle</label>
        <textarea style={textareaStyle} value={value.subtitle} onChange={e => set('subtitle', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>Checklist Items</label>
        {value.checklist.map((item, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <input style={inputStyle} value={item} onChange={e => updateChecklist(i, e.target.value)} />
          </div>
        ))}
      </div>
    </>
  );
};

// ── Playlist Moods ──

export const PlaylistMoodsEditor: React.FC<{
  value: string[];
  onChange: (v: string[]) => void;
}> = ({ value, onChange }) => {
  const update = (i: number, v: string) => {
    const copy = [...value];
    copy[i] = v;
    onChange(copy);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {value.map((mood, i) => (
        <div key={i}>
          <label style={labelStyle}>Mood {i + 1}</label>
          <input style={inputStyle} value={mood} onChange={e => update(i, e.target.value)} />
        </div>
      ))}
    </div>
  );
};

// ── Playlist Tracks ──

export const PlaylistTracksEditor: React.FC<{
  value: CmsPlaylistTrack[];
  onChange: (v: CmsPlaylistTrack[]) => void;
}> = ({ value, onChange }) => {
  const update = (i: number, field: keyof CmsPlaylistTrack, v: string) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [field]: v };
    onChange(copy);
  };
  return (
    <>
      {value.map((t, i) => (
        <div key={i} style={repeatCard}>
          <div style={repeatLabel}>Track {t.num}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 80px 80px 1fr 1fr 80px', gap: 8 }}>
            <div>
              <label style={labelStyle}>Num</label>
              <input style={inputStyle} value={t.num} onChange={e => update(i, 'num', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>CSS Class</label>
              <input style={inputStyle} value={t.cls} onChange={e => update(i, 'cls', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Emoji</label>
              <input style={inputStyle} value={t.emoji} onChange={e => update(i, 'emoji', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={t.title} onChange={e => update(i, 'title', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Artist</label>
              <input style={inputStyle} value={t.artist} onChange={e => update(i, 'artist', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Duration</label>
              <input style={inputStyle} value={t.duration} onChange={e => update(i, 'duration', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

// ── Stats Band ──

export const StatsBandEditor: React.FC<{
  value: CmsStatItem[];
  onChange: (v: CmsStatItem[]) => void;
}> = ({ value, onChange }) => {
  const update = (i: number, field: keyof CmsStatItem, v: string) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [field]: v };
    onChange(copy);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {value.map((s, i) => (
        <div key={i} style={repeatCard}>
          <div style={repeatLabel}>Stat {i + 1}</div>
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Heading</label>
            <input style={inputStyle} value={s.heading} onChange={e => update(i, 'heading', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={textareaStyle} value={s.description} onChange={e => update(i, 'description', e.target.value)} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Testimonial ──

export const TestimonialEditor: React.FC<{
  value: CmsTestimonial;
  onChange: (v: CmsTestimonial) => void;
}> = ({ value, onChange }) => {
  const set = (field: keyof CmsTestimonial, v: string) => onChange({ ...value, [field]: v });
  return (
    <>
      <div style={fieldGroup}>
        <label style={labelStyle}>Quote</label>
        <textarea style={{ ...textareaStyle, minHeight: 80 }} value={value.quote} onChange={e => set('quote', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Author Name</label>
          <input style={inputStyle} value={value.author} onChange={e => set('author', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Author Detail</label>
          <input style={inputStyle} value={value.detail} onChange={e => set('detail', e.target.value)} />
        </div>
      </div>
    </>
  );
};

// ── FAQ Header ──

export const FaqHeaderEditor: React.FC<{
  value: { label: string; title: string };
  onChange: (v: { label: string; title: string }) => void;
}> = ({ value, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
    <div>
      <label style={labelStyle}>Section Label</label>
      <input style={inputStyle} value={value.label} onChange={e => onChange({ ...value, label: e.target.value })} />
    </div>
    <div>
      <label style={labelStyle}>Title</label>
      <input style={inputStyle} value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} />
    </div>
  </div>
);

// ── FAQs ──

export const FaqsEditor: React.FC<{
  value: CmsFaq[];
  onChange: (v: CmsFaq[]) => void;
}> = ({ value, onChange }) => {
  const update = (i: number, field: keyof CmsFaq, v: string) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [field]: v };
    onChange(copy);
  };
  return (
    <>
      {value.map((f, i) => (
        <div key={i} style={repeatCard}>
          <div style={repeatLabel}>FAQ {i + 1}</div>
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Question</label>
            <input style={inputStyle} value={f.q} onChange={e => update(i, 'q', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Answer</label>
            <textarea style={{ ...textareaStyle, minHeight: 80 }} value={f.a} onChange={e => update(i, 'a', e.target.value)} />
          </div>
        </div>
      ))}
    </>
  );
};

// ── Final CTA ──

export const FinalCtaEditor: React.FC<{
  value: CmsFinalCta;
  onChange: (v: CmsFinalCta) => void;
}> = ({ value, onChange }) => {
  const set = (field: keyof CmsFinalCta, v: string) => onChange({ ...value, [field]: v });
  return (
    <>
      <div style={fieldGroup}>
        <label style={labelStyle}>Heading (use \n for line break)</label>
        <textarea style={textareaStyle} value={value.heading} onChange={e => set('heading', e.target.value)} />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle}>Description</label>
        <textarea style={textareaStyle} value={value.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Primary CTA</label>
          <input style={inputStyle} value={value.cta_primary} onChange={e => set('cta_primary', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Secondary CTA</label>
          <input style={inputStyle} value={value.cta_secondary} onChange={e => set('cta_secondary', e.target.value)} />
        </div>
      </div>
    </>
  );
};

// ── Footer ──

export const FooterEditor: React.FC<{
  value: CmsFooter;
  onChange: (v: CmsFooter) => void;
}> = ({ value, onChange }) => {
  const set = (field: keyof CmsFooter, v: string) => onChange({ ...value, [field]: v });
  return (
    <>
      <div style={fieldGroup}>
        <label style={labelStyle}>Brand Description</label>
        <textarea style={textareaStyle} value={value.brand_description} onChange={e => set('brand_description', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Copyright</label>
          <input style={inputStyle} value={value.copyright} onChange={e => set('copyright', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Tagline</label>
          <input style={inputStyle} value={value.tagline} onChange={e => set('tagline', e.target.value)} />
        </div>
      </div>
    </>
  );
};
