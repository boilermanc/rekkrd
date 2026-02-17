
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface CameraModalProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

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
        onCapture(base64);
      }
    }
  };

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Scanning vinyl" className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2528] bg-opacity-90 p-4 outline-none">
      <div className="relative w-full max-w-xl glass-morphism rounded-3xl overflow-hidden neon-border border-[#dd6e42]/30">
        <div className="p-4 flex justify-between items-center border-b border-[#e8dab2]/[0.10]">
          <h2 className="font-label text-[#dd6e42] font-bold tracking-widest text-sm">SCANNING VINYL</h2>
          <button onClick={onClose} className="text-[#c0d6df] hover:text-[#e8e2d6] transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="aspect-square relative bg-[#1a2528] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover${facingMode === 'user' ? ' scale-x-[-1]' : ''}`}
          />
          {!isStreaming && <div className="animate-pulse text-[#7d9199]">Initializing Lens...</div>}

          {/* Overlay grid for aiming */}
          <div className="absolute inset-0 pointer-events-none border-[40px] border-[#1a2528]/20 flex items-center justify-center">
             <div className="w-64 h-64 border-2 border-[#dd6e42]/50 rounded-xl relative">
                <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#dd6e42]"></div>
                <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-[#dd6e42]"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-[#dd6e42]"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#dd6e42]"></div>
             </div>
          </div>
        </div>

        <div className="p-8 flex justify-center">
          <button
            onClick={captureImage}
            className="w-20 h-20 rounded-full border-4 border-[#e8e2d6] flex items-center justify-center active:scale-95 transition-transform hover:border-[#dd6e42]"
          >
            <div className="w-16 h-16 rounded-full bg-[#e8e2d6] hover:bg-[#dd6e42] transition-colors"></div>
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default CameraModal;
