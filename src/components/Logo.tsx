import React from 'react';
import { cn } from '@/lib/utils';

const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <svg
          width="36"
          height="36"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-blue-400 animate-pulse-slow"
        >
          <path
            d="M4 28V16L10 22L16 14L22 19L28 4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse-slow"
          />
          <path
            d="M4 28H28"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="animate-pulse-slow"
          />
          <circle
            cx="10"
            cy="22"
            r="2.5"
            fill="currentColor"
            className="animate-pulse"
            filter="drop-shadow(0 0 4px currentColor)"
          />
          <circle
            cx="16"
            cy="14"
            r="2.5"
            fill="currentColor"
            className="animate-pulse"
            filter="drop-shadow(0 0 4px currentColor)"
          />
          <circle
            cx="22"
            cy="19"
            r="2.5"
            fill="currentColor"
            className="animate-pulse"
            filter="drop-shadow(0 0 4px currentColor)"
          />
          <circle
            cx="28"
            cy="4"
            r="2.5"
            fill="currentColor"
            className="animate-pulse"
            filter="drop-shadow(0 0 4px currentColor)"
          />
        </svg>
        <div 
          className="absolute inset-0 blur-xl bg-blue-400/20 rounded-full"
          style={{ transform: 'scale(0.85)' }}
        />
      </div>
      <span className="text-xl font-bold neon-text tracking-wide">
        FinTrack
      </span>
    </div>
  );
};

export default Logo;