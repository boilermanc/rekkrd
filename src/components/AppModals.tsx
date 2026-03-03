import React from 'react';
import type { Album, ScanConfirmation } from '../types';
import type { ScanMode } from './CameraModal';
import type { ViewMode } from '../hooks/useAppNavigation';
import type { DuplicatePendingData } from '../hooks/useScanFlow';
import type { GatedFeature } from '../contexts/SubscriptionContext';
import type { WantlistItem } from '../types';
import CameraModal from './CameraModal';
import PlaylistStudio from './PlaylistStudio';
import AlbumDetailModal from './AlbumDetailModal';
import UpgradeModal from './UpgradeModal';
import SubscriptionSuccessModal from './SubscriptionSuccessModal';
import DuplicateAlbumModal from './DuplicateAlbumModal';
import ScanConfirmModal from './ScanConfirmModal';
import ScanFailedModal from './ScanFailedModal';
import DiscogsReleaseDetail from './DiscogsReleaseDetail';

interface AppModalsProps {
  // File input
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Camera
  isCameraOpen: boolean;
  setIsCameraOpen: (open: boolean) => void;
  handleCapture: (base64: string, scanMode?: ScanMode) => void;

  // Playlist Studio
  isStudioOpen: boolean;
  setIsStudioOpen: (open: boolean) => void;
  sessionSeedAlbum: Album | null;
  setSessionSeedAlbum: (album: Album | null) => void;
  albums: Album[];

  // Album detail
  selectedAlbum: Album | null;
  setSelectedAlbum: React.Dispatch<React.SetStateAction<Album | null>>;
  handleUpdateAlbum: (albumId: string, updates: Partial<Album>) => Promise<void>;
  handleToggleFavorite: (albumId: string) => Promise<void>;
  handleAddToWantlist: (album: Album) => Promise<void>;
  canUse: (feature: GatedFeature) => boolean;

  // Upgrade
  upgradeFeature: string | null;
  setUpgradeFeature: (feature: string | null) => void;
  pendingPriceId: string | null;
  setPendingPriceId: (id: string | null) => void;
  showSuccessModal: boolean;
  setShowSuccessModal: (show: boolean) => void;
  successPlanName: string;
  setSuccessPlanName: (name: string) => void;

  // Scan confirm / duplicate / failed
  duplicatePending: DuplicatePendingData | null;
  handleDuplicateAddAnyway: () => void;
  handleDuplicateCancel: () => void;
  pendingScan: { scan: ScanConfirmation; base64: string } | null;
  handleScanConfirm: (
    artist: string,
    title: string,
    confirmedDiscogsReleaseId?: number,
    barcode?: string,
    format?: string,
    discogsCoverUrl?: string,
  ) => Promise<void>;
  handleScanCancel: () => void;
  showScanFailed: boolean;
  setShowScanFailed: (show: boolean) => void;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewMode>>;

  // Discogs release detail
  discogsReleaseId: number | null;
  setDiscogsReleaseId: (id: number | null) => void;
}

const AppModals: React.FC<AppModalsProps> = ({
  fileInputRef, handleFileUpload,
  isCameraOpen, setIsCameraOpen, handleCapture,
  isStudioOpen, setIsStudioOpen, sessionSeedAlbum, setSessionSeedAlbum, albums,
  selectedAlbum, setSelectedAlbum, handleUpdateAlbum, handleToggleFavorite, handleAddToWantlist, canUse,
  upgradeFeature, setUpgradeFeature, pendingPriceId, setPendingPriceId,
  showSuccessModal, setShowSuccessModal, successPlanName, setSuccessPlanName,
  duplicatePending, handleDuplicateAddAnyway, handleDuplicateCancel,
  pendingScan, handleScanConfirm, handleScanCancel,
  showScanFailed, setShowScanFailed, setCurrentView,
  discogsReleaseId, setDiscogsReleaseId,
}) => (
  <>
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleFileUpload}
      className="hidden"
    />

    {isCameraOpen && <CameraModal onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
    {isStudioOpen && <PlaylistStudio albums={albums} onClose={() => { setIsStudioOpen(false); setSessionSeedAlbum(null); }} seedAlbum={sessionSeedAlbum} />}
    {selectedAlbum && (
      <AlbumDetailModal
        album={selectedAlbum}
        allAlbums={albums}
        onClose={() => setSelectedAlbum(null)}
        onUpdateTags={(id, tags) => handleUpdateAlbum(id, { tags })}
        onToggleFavorite={handleToggleFavorite}
        onSelectAlbum={setSelectedAlbum}
        onUpdateAlbum={handleUpdateAlbum}
        canUseLyrics={canUse('lyrics')}
        canUseCovers={canUse('covers')}
        onUpgradeRequired={(feature: string) => setUpgradeFeature(feature)}
        onMoreLikeThis={(album) => {
          setSessionSeedAlbum(album);
          setSelectedAlbum(null);
          setIsStudioOpen(true);
        }}
        onAddToWantlist={handleAddToWantlist}
      />
    )}
    {upgradeFeature && (
      <UpgradeModal
        isOpen={!!upgradeFeature}
        onClose={() => { setUpgradeFeature(null); setPendingPriceId(null); }}
        feature={upgradeFeature}
        defaultPriceId={pendingPriceId ?? undefined}
        onSuccess={(planName) => {
          setUpgradeFeature(null);
          setPendingPriceId(null);
          setSuccessPlanName(planName);
          setShowSuccessModal(true);
        }}
      />
    )}
    <SubscriptionSuccessModal
      isOpen={showSuccessModal}
      onClose={() => setShowSuccessModal(false)}
      planName={successPlanName}
    />
    {duplicatePending && (
      <DuplicateAlbumModal
        existingAlbum={duplicatePending.existingAlbum}
        onAddAnyway={handleDuplicateAddAnyway}
        onCancel={handleDuplicateCancel}
      />
    )}
    {pendingScan && (
      <ScanConfirmModal
        scan={pendingScan.scan}
        onConfirm={handleScanConfirm}
        onCancel={handleScanCancel}
      />
    )}
    {showScanFailed && (
      <ScanFailedModal
        onTryAgain={() => { setShowScanFailed(false); setIsCameraOpen(true); }}
        onSearchManually={() => { setShowScanFailed(false); setCurrentView('discogs'); }}
        onClose={() => setShowScanFailed(false)}
      />
    )}
    {discogsReleaseId !== null && (
      <DiscogsReleaseDetail
        releaseId={discogsReleaseId}
        onClose={() => setDiscogsReleaseId(null)}
      />
    )}
  </>
);

export default AppModals;
