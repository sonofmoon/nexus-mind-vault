import React from 'react';

export const ShimmerBox: React.FC<{ width?: string; height?: string; borderRadius?: string; style?: React.CSSProperties }> = ({
  width = '100%',
  height = '16px',
  borderRadius = '8px',
  style,
}) => {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export const EntryListSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <ShimmerBox width="45%" height="20px" borderRadius="6px" />
            <ShimmerBox width="20%" height="14px" borderRadius="100px" />
          </div>
          <ShimmerBox width="90%" height="14px" />
          <ShimmerBox width="75%" height="14px" />
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <ShimmerBox width="60px" height="22px" borderRadius="100px" />
            <ShimmerBox width="80px" height="22px" borderRadius="100px" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const CapsuleGridSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', width: '100%' }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShimmerBox width="36px" height="36px" borderRadius="10px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <ShimmerBox width="70%" height="16px" />
              <ShimmerBox width="40%" height="12px" />
            </div>
          </div>
          <ShimmerBox width="100%" height="40px" borderRadius="8px" />
          <ShimmerBox width="100%" height="34px" borderRadius="10px" />
        </div>
      ))}
    </div>
  );
};
