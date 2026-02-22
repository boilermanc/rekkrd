
import React, { useState, useCallback } from 'react';
import { NewGear, Gear, IdentifiedGear } from '../types';
import { geminiService, ScanLimitError, UpgradeRequiredError, GearLimitError, checkGearLimit } from '../services/geminiService';
import { gearService } from '../services/gearService';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import GearCaptureGuide from './GearCaptureGuide';
import GearUploadGuide from './GearUploadGuide';
import GearConfirmModal from './GearConfirmModal';
import SpinningRecord from './SpinningRecord';

type FlowStep = 'capture' | 'identifying' | 'confirm' | null;

interface AddGearFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onGearSaved: (gear: Gear) => void;
  onUpgradeRequired?: (feature: string) => void;
  mode?: 'scan' | 'upload';
}

const AddGearFlow: React.FC<AddGearFlowProps> = ({
  isOpen,
  onClose,
  onGearSaved,
  onUpgradeRequired,
  mode = 'scan',
}) => {
  const { showToast } = useToast();
  const { canUse } = useSubscription();
  const [flowStep, setFlowStep] = useState<FlowStep>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [identifiedGear, setIdentifiedGear] = useState<IdentifiedGear | null>(null);

  const resetFlow = useCallback(() => {
    setFlowStep(null);
    setCapturedImage(null);
    setIdentifiedGear(null);
    onClose();
  }, [onClose]);

  // Start flow when isOpen becomes true
  const effectiveStep = isOpen && flowStep === null ? 'capture' : flowStep;

  const handleCaptureComplete = useCallback(async (images: { front: string; label?: string }) => {
    // Check scan limit before calling the API
    if (!canUse('scan')) {
      onUpgradeRequired?.('scan');
      resetFlow();
      return;
    }

    // TODO: Multi-image identification can be added later by sending images.label
    // alongside images.front to the identify-gear API.
    const base64 = images.front;
    setCapturedImage(base64);
    setFlowStep('identifying');

    try {
      const result = await geminiService.identifyGear(base64);

      if (!result) {
        showToast("Couldn't identify that gear. Try a clearer shot!", 'error');
        setFlowStep('capture');
        return;
      }

      setIdentifiedGear(result);
      setFlowStep('confirm');
    } catch (err) {
      if (err instanceof ScanLimitError) {
        onUpgradeRequired?.('scan');
        resetFlow();
      } else if (err instanceof UpgradeRequiredError) {
        onUpgradeRequired?.('scan');
        resetFlow();
      } else {
        console.error('Gear identification failed:', err);
        showToast('Something went wrong during identification.', 'error');
        setFlowStep('capture');
      }
    }
  }, [canUse, showToast, onUpgradeRequired, resetFlow]);

  const handleSave = useCallback(async (gear: NewGear) => {
    try {
      // Server-side gear limit enforcement
      await checkGearLimit();

      const saved = await gearService.saveGear(gear);
      showToast(`${gear.brand} ${gear.model} added to Stakkd!`, 'success');
      onGearSaved(saved);
      resetFlow();
    } catch (err) {
      if (err instanceof GearLimitError) {
        onUpgradeRequired?.('gear_limit');
        resetFlow();
      } else {
        console.error('Failed to save gear:', err);
        showToast('Failed to save gear. Please try again.', 'error');
      }
    }
  }, [showToast, onGearSaved, resetFlow, onUpgradeRequired]);

  const handleConfirmClose = useCallback(() => {
    // Go back to capture for rescan/re-upload
    setIdentifiedGear(null);
    setFlowStep('capture');
  }, []);

  if (!isOpen && flowStep === null) return null;

  return (
    <>
      {/* Guided capture/upload step */}
      {effectiveStep === 'capture' && (
        mode === 'upload' ? (
          <GearUploadGuide
            isOpen={true}
            onComplete={handleCaptureComplete}
            onClose={resetFlow}
          />
        ) : (
          <GearCaptureGuide
            isOpen={true}
            onComplete={handleCaptureComplete}
            onClose={resetFlow}
          />
        )
      )}

      {/* Identifying loading overlay */}
      {effectiveStep === 'identifying' && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-th-bg/80 backdrop-blur-md">
          <SpinningRecord size="w-64 h-64 md:w-96 md:h-96" />
          <div className="mt-8 md:mt-12 text-center px-6">
            <p className="font-label text-[#dd6e42] text-xl md:text-2xl font-bold animate-pulse tracking-[0.3em] uppercase">
              Identifying Your Gear...
            </p>
          </div>
        </div>
      )}

      {/* Confirm step */}
      {effectiveStep === 'confirm' && identifiedGear && capturedImage && (
        <GearConfirmModal
          isOpen={true}
          onClose={handleConfirmClose}
          onSave={handleSave}
          identifiedGear={identifiedGear}
          originalPhoto={capturedImage}
        />
      )}
    </>
  );
};

export default AddGearFlow;
