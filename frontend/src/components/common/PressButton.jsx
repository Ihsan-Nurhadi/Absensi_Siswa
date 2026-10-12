import React from 'react';

export const PressButton = ({ children, variant = 'primary', icon: Icon, onClick, type = 'button', disabled = false, className = '' }) => {
  let variantClass = 'press-btn';
  if (variant === 'secondary') variantClass = 'press-btn press-btn-secondary';
  if (variant === 'amber') variantClass = 'press-btn press-btn-amber';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClass} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default PressButton;
