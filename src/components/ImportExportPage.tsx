import React, { useState } from 'react';
import BulkImport from './BulkImport';
import CollectionExport from './CollectionExport';
import { useSubscription } from '../contexts/SubscriptionContext';
import type { Album } from '../types';

type Tab = 'import' | 'export';

interface ImportExportPageProps {
  albums: Album[];
  userEmail: string;
  onUpgradeRequired: (feature: string) => void;
  onImportComplete: () => void;
  onNavigate: (view: string) => void;
  defaultTab?: Tab;
}

const ImportExportPage: React.FC<ImportExportPageProps> = ({
  albums,
  userEmail,
  onUpgradeRequired,
  onImportComplete,
  onNavigate,
  defaultTab = 'import',
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const { canUse } = useSubscription();

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 mt-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-th-text">Import & Export</h1>

        {/* Pill tabs */}
        <div className="flex gap-1 bg-th-surface/[0.04] rounded-lg p-1" role="tablist" aria-label="Import and Export tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'import'}
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-md text-sm font-label tracking-wide transition-all ${
              activeTab === 'import'
                ? 'bg-[#dd6e42] text-white shadow'
                : 'text-th-text2 hover:text-th-text'
            }`}
          >
            Import
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'export'}
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-md text-sm font-label tracking-wide transition-all ${
              activeTab === 'export'
                ? 'bg-[#dd6e42] text-white shadow'
                : 'text-th-text2 hover:text-th-text'
            }`}
          >
            Export
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'import' && (
        <BulkImport
          onUpgradeRequired={onUpgradeRequired}
          albums={albums}
          onImportComplete={onImportComplete}
          onNavigate={onNavigate}
          embedded
        />
      )}

      {activeTab === 'export' && (
        canUse('export') ? (
          <CollectionExport albums={albums} userEmail={userEmail} />
        ) : (
          <div className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-8 md:p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#dd6e42]/10">
              <svg className="w-7 h-7 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-th-text mb-2">Collection Export</h3>
            <p className="text-sm text-th-text3 max-w-sm mx-auto mb-6">
              Download your vinyl collection as a CSV spreadsheet or a beautifully styled PDF catalog.
            </p>
            <button
              onClick={() => onUpgradeRequired('export')}
              className="px-6 py-3 rounded-xl bg-[#dd6e42] text-white font-label tracking-wide text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Upgrade to Curator
            </button>
          </div>
        )
      )}
    </main>
  );
};

export default ImportExportPage;
