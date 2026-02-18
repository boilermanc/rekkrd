import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import type { CmsContentRow } from '../../services/adminService';
import type { CmsLandingContent, CmsLegalBody } from '../../types/cms';
import {
  LANDING_DEFAULTS,
  DEFAULT_HERO,
  DEFAULT_PROOF_STATS,
  DEFAULT_FEATURES_HEADER,
  DEFAULT_FEATURES,
  DEFAULT_HOW_IT_WORKS_HEADER,
  DEFAULT_HOW_IT_WORKS,
  DEFAULT_SHOWCASE,
  DEFAULT_SHOWCASE_CARDS,
  DEFAULT_PLAYLIST_HEADER,
  DEFAULT_PLAYLIST_MOODS,
  DEFAULT_PLAYLIST_TRACKS,
  DEFAULT_STATS_BAND,
  DEFAULT_TESTIMONIAL,
  DEFAULT_FAQ_HEADER,
  DEFAULT_FAQS,
  DEFAULT_FINAL_CTA,
  DEFAULT_FOOTER,
} from '../../constants/landingDefaults';
import SectionEditor from './content/SectionEditor';
import RichTextEditor from './content/RichTextEditor';
import {
  HeroEditor,
  ProofStatsEditor,
  SectionHeaderEditor,
  FeaturesEditor,
  StepsEditor,
  ShowcaseEditor,
  ShowcaseCardsEditor,
  PlaylistHeaderEditor,
  PlaylistMoodsEditor,
  PlaylistTracksEditor,
  StatsBandEditor,
  TestimonialEditor,
  FaqHeaderEditor,
  FaqsEditor,
  FinalCtaEditor,
  FooterEditor,
} from './content/LandingSections';

type PageTab = 'landing' | 'privacy' | 'terms';

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 20px',
  borderRadius: 6,
  border: 'none',
  background: active ? 'rgb(99,102,241)' : 'transparent',
  color: active ? 'white' : 'rgb(107,114,128)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
});

const ContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>('landing');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Landing state
  const [landing, setLanding] = useState<CmsLandingContent>({ ...LANDING_DEFAULTS });
  const [landingOriginal, setLandingOriginal] = useState<CmsLandingContent>({ ...LANDING_DEFAULTS });
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Legal pages state
  const [privacyHtml, setPrivacyHtml] = useState('');
  const [privacyDate, setPrivacyDate] = useState('');
  const [privacyOriginal, setPrivacyOriginal] = useState({ html: '', date: '' });
  const [termsHtml, setTermsHtml] = useState('');
  const [termsDate, setTermsDate] = useState('');
  const [termsOriginal, setTermsOriginal] = useState({ html: '', date: '' });
  const [savingLegal, setSavingLegal] = useState(false);

  // Load content for active tab
  const loadContent = useCallback(async (page: PageTab) => {
    setLoading(true);
    setSaveStatus(null);
    try {
      const rows: CmsContentRow[] = await adminService.getCmsContent(page);
      const map: Record<string, unknown> = {};
      for (const row of rows) {
        map[row.section] = row.content;
      }

      if (page === 'landing') {
        const merged: CmsLandingContent = { ...LANDING_DEFAULTS };
        for (const key of Object.keys(LANDING_DEFAULTS) as (keyof CmsLandingContent)[]) {
          if (map[key] !== undefined) {
            (merged as unknown as Record<string, unknown>)[key] = map[key];
          }
        }
        setLanding(merged);
        setLandingOriginal(JSON.parse(JSON.stringify(merged)));
      } else if (page === 'privacy') {
        const body = map.body as CmsLegalBody | undefined;
        const html = body?.html || '';
        const date = body?.last_updated || '';
        setPrivacyHtml(html);
        setPrivacyDate(date);
        setPrivacyOriginal({ html, date });
      } else if (page === 'terms') {
        const body = map.body as CmsLegalBody | undefined;
        const html = body?.html || '';
        const date = body?.effective_date || '';
        setTermsHtml(html);
        setTermsDate(date);
        setTermsOriginal({ html, date });
      }
    } catch (err) {
      console.error('Failed to load CMS content:', err);
      setSaveStatus('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent(activeTab);
  }, [activeTab, loadContent]);

  // Save a landing section
  const saveLandingSection = async (section: keyof CmsLandingContent) => {
    setSavingSection(section);
    setSaveStatus(null);
    try {
      await adminService.saveCmsSection('landing', section, landing[section]);
      setLandingOriginal(prev => ({
        ...prev,
        [section]: JSON.parse(JSON.stringify(landing[section])),
      }));
      setSaveStatus(`Saved "${section}" successfully`);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus(`Failed to save "${section}"`);
    } finally {
      setSavingSection(null);
    }
  };

  // Revert a landing section to defaults
  const revertLandingSection = (section: keyof CmsLandingContent) => {
    setLanding(prev => ({
      ...prev,
      [section]: JSON.parse(JSON.stringify(LANDING_DEFAULTS[section])),
    }));
  };

  // Check if a landing section has unsaved changes
  const isDirty = (section: keyof CmsLandingContent) =>
    JSON.stringify(landing[section]) !== JSON.stringify(landingOriginal[section]);

  // Save legal page
  const saveLegalPage = async (page: 'privacy' | 'terms') => {
    setSavingLegal(true);
    setSaveStatus(null);
    try {
      const content: CmsLegalBody = page === 'privacy'
        ? { html: privacyHtml, last_updated: privacyDate }
        : { html: termsHtml, effective_date: termsDate };
      await adminService.saveCmsSection(page, 'body', content);
      if (page === 'privacy') {
        setPrivacyOriginal({ html: privacyHtml, date: privacyDate });
      } else {
        setTermsOriginal({ html: termsHtml, date: termsDate });
      }
      setSaveStatus(`Saved ${page} page successfully`);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus(`Failed to save ${page} page`);
    } finally {
      setSavingLegal(false);
    }
  };

  // Update a landing section value
  const updateLanding = <K extends keyof CmsLandingContent>(
    section: K,
    value: CmsLandingContent[K]
  ) => {
    setLanding(prev => ({ ...prev, [section]: value }));
  };

  // Landing section config for rendering
  const landingSections: {
    key: keyof CmsLandingContent;
    title: string;
    render: () => React.ReactNode;
  }[] = [
    { key: 'hero', title: 'Hero Section', render: () => <HeroEditor value={landing.hero} onChange={v => updateLanding('hero', v)} /> },
    { key: 'proof_stats', title: 'Proof Stats Bar', render: () => <ProofStatsEditor value={landing.proof_stats} onChange={v => updateLanding('proof_stats', v)} /> },
    { key: 'features_header', title: 'Features Header', render: () => <SectionHeaderEditor value={landing.features_header} onChange={v => updateLanding('features_header', v)} /> },
    { key: 'features', title: 'Features (6 Cards)', render: () => <FeaturesEditor value={landing.features} onChange={v => updateLanding('features', v)} /> },
    { key: 'how_it_works_header', title: 'How It Works Header', render: () => <SectionHeaderEditor value={landing.how_it_works_header} onChange={v => updateLanding('how_it_works_header', v)} /> },
    { key: 'how_it_works', title: 'How It Works (3 Steps)', render: () => <StepsEditor value={landing.how_it_works} onChange={v => updateLanding('how_it_works', v)} /> },
    { key: 'showcase', title: 'Showcase Section', render: () => <ShowcaseEditor value={landing.showcase} onChange={v => updateLanding('showcase', v)} /> },
    { key: 'showcase_cards', title: 'Showcase Cards', render: () => <ShowcaseCardsEditor value={landing.showcase_cards} onChange={v => updateLanding('showcase_cards', v)} /> },
    { key: 'playlist_header', title: 'Playlist Section', render: () => <PlaylistHeaderEditor value={landing.playlist_header} onChange={v => updateLanding('playlist_header', v)} /> },
    { key: 'playlist_moods', title: 'Playlist Moods', render: () => <PlaylistMoodsEditor value={landing.playlist_moods} onChange={v => updateLanding('playlist_moods', v)} /> },
    { key: 'playlist_tracks', title: 'Playlist Tracks', render: () => <PlaylistTracksEditor value={landing.playlist_tracks} onChange={v => updateLanding('playlist_tracks', v)} /> },
    { key: 'stats_band', title: 'Stats Band', render: () => <StatsBandEditor value={landing.stats_band} onChange={v => updateLanding('stats_band', v)} /> },
    { key: 'testimonial', title: 'Testimonial', render: () => <TestimonialEditor value={landing.testimonial} onChange={v => updateLanding('testimonial', v)} /> },
    { key: 'faq_header', title: 'FAQ Header', render: () => <FaqHeaderEditor value={landing.faq_header} onChange={v => updateLanding('faq_header', v)} /> },
    { key: 'faqs', title: 'FAQs (6 Items)', render: () => <FaqsEditor value={landing.faqs} onChange={v => updateLanding('faqs', v)} /> },
    { key: 'final_cta', title: 'Final CTA', render: () => <FinalCtaEditor value={landing.final_cta} onChange={v => updateLanding('final_cta', v)} /> },
    { key: 'footer', title: 'Footer', render: () => <FooterEditor value={landing.footer} onChange={v => updateLanding('footer', v)} /> },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'rgb(17,24,39)', margin: 0 }}>
          Content Management
        </h1>
        <p style={{ fontSize: 13, color: 'rgb(107,114,128)', marginTop: 4 }}>
          Edit page content without touching code. Changes go live immediately after saving.
        </p>
      </div>

      {/* Status bar */}
      {saveStatus && (
        <div style={{
          padding: '8px 14px',
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 13,
          background: saveStatus.includes('Failed') ? 'rgb(254,242,242)' : 'rgb(236,253,245)',
          color: saveStatus.includes('Failed') ? 'rgb(185,28,28)' : 'rgb(5,150,105)',
          border: `1px solid ${saveStatus.includes('Failed') ? 'rgb(254,202,202)' : 'rgb(167,243,208)'}`,
        }}>
          {saveStatus}
        </div>
      )}

      {/* Page tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'rgb(243,244,246)',
        borderRadius: 8,
        marginBottom: 24,
        width: 'fit-content',
      }}>
        {(['landing', 'privacy', 'terms'] as PageTab[]).map(tab => (
          <button
            key={tab}
            style={tabStyle(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'landing' ? 'Landing Page' : tab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgb(156,163,175)', fontSize: 14 }}>
          Loading content...
        </div>
      )}

      {/* Landing sections */}
      {!loading && activeTab === 'landing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {landingSections.map(sec => (
            <SectionEditor
              key={sec.key}
              title={sec.title}
              dirty={isDirty(sec.key)}
              saving={savingSection === sec.key}
              onSave={() => saveLandingSection(sec.key)}
              onRevert={() => revertLandingSection(sec.key)}
            >
              {sec.render()}
            </SectionEditor>
          ))}
        </div>
      )}

      {/* Privacy editor */}
      {!loading && activeTab === 'privacy' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgb(107,114,128)', marginBottom: 4 }}>
              Last Updated Date
            </label>
            <input
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgb(209,213,219)',
                fontSize: 13,
                width: 250,
              }}
              value={privacyDate}
              onChange={e => setPrivacyDate(e.target.value)}
              placeholder="e.g. February 17, 2026"
            />
          </div>
          <RichTextEditor content={privacyHtml} onChange={setPrivacyHtml} />
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setPrivacyHtml(privacyOriginal.html);
                setPrivacyDate(privacyOriginal.date);
              }}
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
              Revert
            </button>
            <button
              onClick={() => saveLegalPage('privacy')}
              disabled={savingLegal}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: savingLegal ? 'rgb(165,180,252)' : 'rgb(99,102,241)',
                color: 'white',
                cursor: savingLegal ? 'default' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {savingLegal ? 'Saving...' : 'Save Privacy Policy'}
            </button>
          </div>
        </div>
      )}

      {/* Terms editor */}
      {!loading && activeTab === 'terms' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgb(107,114,128)', marginBottom: 4 }}>
              Effective Date
            </label>
            <input
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgb(209,213,219)',
                fontSize: 13,
                width: 250,
              }}
              value={termsDate}
              onChange={e => setTermsDate(e.target.value)}
              placeholder="e.g. February 17, 2026"
            />
          </div>
          <RichTextEditor content={termsHtml} onChange={setTermsHtml} />
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setTermsHtml(termsOriginal.html);
                setTermsDate(termsOriginal.date);
              }}
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
              Revert
            </button>
            <button
              onClick={() => saveLegalPage('terms')}
              disabled={savingLegal}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: savingLegal ? 'rgb(165,180,252)' : 'rgb(99,102,241)',
                color: 'white',
                cursor: savingLegal ? 'default' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {savingLegal ? 'Saving...' : 'Save Terms of Service'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentPage;
