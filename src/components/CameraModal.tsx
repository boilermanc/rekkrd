
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Disc3, ScanBarcode, ScanLine, Info } from 'lucide-react';
import SideBPromptModal from './SideBPromptModal';

export type ScanMode = 'cover' | 'barcode' | 'label';

interface CameraModalProps {
  onCapture: (base64: string, scanMode: ScanMode) => void;
  onClose: () => void;
  showSideBPrompt: boolean;
  confirmSideBAndScanA: () => void;
  skipSideA: () => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose, showSideBPrompt, confirmSideBAndScanA, skipSideA }) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [scanMode, setScanMode] = useState<ScanMode>('cover');

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1080 } }
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error('Camera access error:', err);
        showToast('Could not access camera. Please check permissions.', 'error');
      }
    }
    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showToast]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(base64, scanMode);
      }
    }
  };

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Scanning vinyl" className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg bg-opacity-90 p-4 outline-none">
      <div className="relative w-full max-w-xl glass-morphism rounded-3xl overflow-hidden neon-border border-[#dd6e42]/30">
        <div className="p-4 flex justify-between items-center border-b border-th-surface/[0.10]">
          <h2 className="font-label text-[#dd6e42] font-bold tracking-widest text-sm">SCANNING VINYL</h2>
          <button onClick={onClose} className="text-th-text2 hover:text-th-text transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="aspect-square relative bg-th-bg flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover${facingMode === 'user' ? ' scale-x-[-1]' : ''}`}
          />
          {!isStreaming && <div className="animate-pulse text-th-text3">Initializing Lens...</div>}

          {/* Cover Art overlay */}
          {scanMode === 'cover' && (
            <div className="absolute inset-0 pointer-events-none border-[40px] border-th-bg/20 flex items-center justify-center">
               <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-[#dd6e42]/50 rounded-xl relative">
                  <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#dd6e42]"></div>
                  <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-[#dd6e42]"></div>
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-[#dd6e42]"></div>
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#dd6e42]"></div>
               </div>
            </div>
          )}

          {/* Barcode overlay */}
          {scanMode === 'barcode' && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Dim top and bottom */}
              <div className="absolute inset-0 bg-th-bg/40" />
              {/* Targeting box */}
              <div className="relative w-[80%] h-[80px] border-2 border-[#dd6e42]/50 rounded-lg bg-transparent z-10">
                {/* Clear the targeting area */}
                <div className="absolute inset-0 bg-th-bg/0" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                {/* Corner highlights */}
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-[3px] border-l-[3px] border-[#dd6e42] rounded-tl-sm"></div>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-[3px] border-r-[3px] border-[#dd6e42] rounded-tr-sm"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-[3px] border-l-[3px] border-[#dd6e42] rounded-bl-sm"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-[3px] border-r-[3px] border-[#dd6e42] rounded-br-sm"></div>
                {/* Animated scan line */}
                <div className="absolute left-2 right-2 h-0.5 bg-[#dd6e42] rounded-full opacity-80 animate-barcode-scan" />
              </div>
              {/* Label below targeting box */}
              <p className="relative z-10 mt-4 text-th-text text-[10px] font-label tracking-widest uppercase">
                Align barcode within the frame
              </p>
            </div>
          )}
        </div>

        {/* Mode toggle + instruction */}
        <div className="px-4 pt-4 flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScanMode('label')}
              aria-pressed={scanMode === 'label'}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-label tracking-widest uppercase transition-all ${
                scanMode === 'label'
                  ? 'bg-[#dd6e42] text-th-text font-bold'
                  : 'glass-morphism text-th-text2 hover:text-th-text border border-th-surface/[0.10]'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              Label
            </button>
            <button
              type="button"
              onClick={() => setScanMode('barcode')}
              aria-pressed={scanMode === 'barcode'}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-label tracking-widest uppercase transition-all ${
                scanMode === 'barcode'
                  ? 'bg-[#dd6e42] text-th-text font-bold'
                  : 'glass-morphism text-th-text2 hover:text-th-text border border-th-surface/[0.10]'
              }`}
            >
              <ScanBarcode className="w-3.5 h-3.5" />
              Barcode
            </button>
            <button
              type="button"
              onClick={() => setScanMode('cover')}
              aria-pressed={scanMode === 'cover'}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-label tracking-widest uppercase transition-all ${
                scanMode === 'cover'
                  ? 'bg-[#dd6e42] text-th-text font-bold'
                  : 'glass-morphism text-th-text2 hover:text-th-text border border-th-surface/[0.10]'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              Cover Art
            </button>
          </div>
          <p className="text-th-text3 text-[10px] tracking-wider">
            {scanMode === 'label' ? 'Point at the record label' : scanMode === 'cover' ? 'Point at the album cover' : 'Point at the barcode on the sleeve or label'}
          </p>
          {scanMode === 'label' && (
            <p className="flex items-center gap-1.5 text-th-text3/70 text-[9px] tracking-wider max-w-xs text-center leading-relaxed">
              <Info className="w-3 h-3 shrink-0" />
              Point your camera at the record label — the paper circle in the center. Fill the frame and avoid glare. Side A preferred.
            </p>
          )}
        </div>

        <div className="p-6 flex justify-center">
          <button
            onClick={captureImage}
            className="w-20 h-20 rounded-full border-4 border-th-text flex items-center justify-center active:scale-95 transition-transform hover:border-[#dd6e42]"
          >
            <div className="w-16 h-16 rounded-full bg-th-text hover:bg-[#dd6e42] transition-colors"></div>
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <SideBPromptModal isOpen={showSideBPrompt} onScanA={confirmSideBAndScanA} onSkip={skipSideA} />

      {/* Scan line animation */}
      <style>{`
        @keyframes barcode-scan {
          0%, 100% { top: 4px; }
          50% { top: calc(100% - 6px); }
        }
        .animate-barcode-scan {
          animation: barcode-scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CameraModal;
