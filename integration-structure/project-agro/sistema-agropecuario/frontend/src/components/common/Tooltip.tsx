import React from 'react';

const Tooltip: React.FC<{ text: string; ariaLabel?: string; className?: string }> = ({ text, ariaLabel = 'tooltip', className = '' }) => {
  return (
    <span aria-label={ariaLabel} className={`tooltip-styled ${className}`} data-tooltip={text} style={{ cursor: 'help' }}>
      ℹ️
    </span>
  );
};

export default Tooltip;
