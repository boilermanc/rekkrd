
import React, { useRef, useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';

interface CameraModalProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);

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
  }, []);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
      <div className="relative w-full max-w-xl glass-morphism rounded-3xl overflow-hidden neon-border border-pink-500/30">
        <div className="p-4 flex justify-between items-center border-b border-white/10">
          <h2 className="font-syncopate text-pink-500 font-bold tracking-widest text-sm">SCANNING VINYL</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="aspect-square relative bg-black flex items-center justify-center overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {!isStreaming && <div className="animate-pulse text-white/50">Initializing Lens...</div>}
          
          {/* Overlay grid for aiming */}
          <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20 flex items-center justify-center">
             <div className="w-64 h-64 border-2 border-pink-500/50 rounded-xl relative">
                <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-pink-500"></div>
                <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-pink-500"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-pink-500"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-pink-500"></div>
             </div>
          </div>
        </div>

        <div className="p-8 flex justify-center">
          <button 
            onClick={captureImage}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform hover:border-pink-500"
          >
            <div className="w-16 h-16 rounded-full bg-white hover:bg-pink-500 transition-colors"></div>
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default CameraModal;
