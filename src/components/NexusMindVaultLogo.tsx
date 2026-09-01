import React from 'react';

interface LogoProps {
  height?: number | string;
  className?: string;
}

export const NexusMindVaultLogo: React.FC<LogoProps> = ({ height = 36, className = '' }) => {
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className={`inline-flex items-center select-none cursor-default ${className}`} style={{ height: heightStyle, cursor: 'default' }}>
      <img
        src="/nmv-logo.png"
        alt="Nexus Mind Vault Logo"
        referrerPolicy="no-referrer"
        draggable={false}
        style={{
          height: '100%',
          width: 'auto',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block',
          cursor: 'default',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

