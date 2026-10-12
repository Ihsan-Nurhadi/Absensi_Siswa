import React from 'react';

export const SkeuoCard = ({ children, className = '', hoverable = false, style = {}, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`skeuo-card ${hoverable ? 'skeuo-card-hover' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default SkeuoCard;
