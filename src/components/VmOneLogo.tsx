import React from 'react';

interface VmOneLogoProps {
  size?: number;
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
}

export const VmOneLogo: React.FC<VmOneLogoProps> = ({
  size = 36,
  showWordmark = true,
  showTagline = false,
  className = '',
}) => {
  return (
    <div className={`vm-one-logo-lockup ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      {/* VM ONE 4-FIGURE PINWHEEL ICON */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Red Figure Top Left */}
        <circle cx="34" cy="22" r="11" fill="#DA3D38" />
        <path d="M 22 36 C 22 30, 42 30, 46 36 L 46 48 L 22 48 Z" fill="#DA3D38" />

        {/* Green Figure Top Right */}
        <circle cx="78" cy="34" r="11" fill="#459854" />
        <path d="M 64 22 C 70 22, 70 42, 64 46 L 52 46 L 52 22 Z" fill="#459854" />

        {/* Amber Figure Bottom Right */}
        <circle cx="66" cy="78" r="11" fill="#EDAE45" />
        <path d="M 78 64 C 78 70, 58 70, 54 64 L 54 52 L 78 52 Z" fill="#EDAE45" />

        {/* Blue Figure Bottom Left */}
        <circle cx="22" cy="66" r="11" fill="#1E71B5" />
        <path d="M 36 78 C 30 78, 30 58, 36 54 L 48 54 L 48 78 Z" fill="#1E71B5" />

        {/* White Center Core Square */}
        <rect x="42" y="42" width="16" height="16" rx="3" fill="#FFFFFF" />
      </svg>

      {/* WORDMARK & TAGLINE */}
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{ fontSize: Math.round(size * 0.58), fontWeight: 900, letterSpacing: '-0.03em' }}>
            <span style={{ color: '#01A350' }}>VM</span>{' '}
            <span style={{ color: '#0746D3' }}>ONE</span>
          </div>
          {showTagline && (
            <span style={{ fontSize: Math.round(size * 0.28), fontWeight: 700, color: '#64748b', marginTop: 2 }}>
              ഒരുമ · സേവനം · വളർച്ച
            </span>
          )}
        </div>
      )}
    </div>
  );
};
