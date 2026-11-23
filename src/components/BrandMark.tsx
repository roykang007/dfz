import { useState } from 'react';

export function DufreezLogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Geometric Cryo-Prism Monogram for DUFREEZ */}
      <polygon
        points="16,2 28,9 28,23 16,30 4,23 4,9"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <polygon
        points="16,7 23,11 23,21 16,25 9,21 9,11"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
      />
      <path d="M16 2V30M4 9L28 23M28 9L4 23" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  );
}

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({ src, alt, className = '', fallbackTitle }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EDF2F7] via-[#F7FAFC] to-[#E2E8F0] text-[#1E4E79] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <DufreezLogoMark className="w-10 h-10 mb-3 opacity-60" />
        <span className="text-xs font-medium tracking-wide text-[#0D1B2A]/70 line-clamp-2">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
