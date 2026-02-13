
import React from 'react';
import { useToast } from '../contexts/ToastContext';

const typeConfig = {
  success: {
    border: 'border-emerald-500/30',
    icon: (
      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    border: 'border-red-500/30',
    icon: (
      <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  info: {
    border: 'border-indigo-400/30',
    icon: (
      <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    border: 'border-amber-500/30',
    icon: (
      <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

const Toast: React.FC = () => {
  const { toast, visible, dismiss } = useToast();

  if (!toast) return null;

  const config = typeConfig[toast.type];
  const action = toast.options?.action;
  const onAction = toast.options?.onAction;

  return (
    <div
      key={toast.key}
      className={`fixed top-6 md:top-10 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
    >
      <div className={`glass-morphism rounded-full border ${config.border} px-6 py-3 shadow-lg flex items-center gap-3`}>
        {config.icon}
        <p className="text-white text-[10px] font-syncopate tracking-wider uppercase">{toast.message}</p>
        {action && onAction && (
          <button
            onClick={() => { onAction(); dismiss(); }}
            className="ml-2 text-[10px] font-syncopate tracking-wider uppercase font-bold text-white bg-white/10 hover:bg-white/20 rounded-full px-4 py-1.5 transition-colors border border-white/10"
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
