
import React from 'react';

const SpinningRecord: React.FC<{ size?: string; labelColor?: string }> = ({
  size = "w-64 h-64",
  labelColor = "bg-[#c45a30]"
}) => {
  return (
    <div className={`relative ${size} animate-[spin_3s_linear_infinite] group transition-all duration-500`}>
      {/* The Vinyl Disc — always dark regardless of theme */}
      <div className="absolute inset-0 bg-[#0a0a0a] rounded-full border-4 border-[#1a1a1a] shadow-[0_0_50px_rgba(0,0,0,0.8),_inset_0_0_20px_rgba(255,255,255,0.05)] flex items-center justify-center overflow-hidden">
        {/* Grooves */}
        <div className="absolute inset-2 border border-th-surface/[0.04] rounded-full"></div>
        <div className="absolute inset-4 border border-th-surface/[0.04] rounded-full"></div>
        <div className="absolute inset-6 border border-th-surface/[0.04] rounded-full"></div>
        <div className="absolute inset-8 border border-th-surface/[0.04] rounded-full"></div>
        <div className="absolute inset-10 border border-th-surface/[0.04] rounded-full"></div>
        <div className="absolute inset-12 border border-th-surface/[0.04] rounded-full"></div>
        <div className="absolute inset-14 border border-th-surface/[0.04] rounded-full"></div>
        <div className="absolute inset-16 border border-th-surface/[0.04] rounded-full"></div>
        <div className="absolute inset-20 border border-th-surface/[0.04] rounded-full"></div>

        {/* Center Label */}
        <div className={`w-[35%] h-[35%] ${labelColor} rounded-full border-2 border-th-surface/[0.15] flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] relative`}>
          <div className="w-3 h-3 bg-[#1a2528] rounded-full shadow-inner border border-th-surface/[0.08] z-10"></div>
          <div className="absolute inset-0 flex items-center justify-center text-[7px] font-label text-th-text2 uppercase tracking-widest">
            <span className="rotate-0 absolute -top-5 font-bold">THE CROWE</span>
            <span className="rotate-180 absolute -bottom-5 font-bold">COLLECTION</span>
          </div>
          <div className="absolute inset-0 bg-th-surface/[0.04] rounded-full pointer-events-none"></div>
        </div>
      </div>

      {/* Dynamic Reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-th-surface/[0.08] to-transparent pointer-events-none rounded-full rotate-45"></div>
      <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-th-surface/[0.04] to-transparent pointer-events-none rounded-full -rotate-45"></div>
    </div>
  );
};

export default SpinningRecord;
