import React, { useState } from 'react';
import { Server, Settings, CheckCircle } from 'lucide-react';
import { VPSSetupModal } from './VPSSetupModal';

interface VPSSetupButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export const VPSSetupButton: React.FC<VPSSetupButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  children
}) => {
  const [showModal, setShowModal] = useState(false);

  const baseClasses = `
    inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md',
    secondary: 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 focus:ring-blue-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={buttonClasses}
      >
        <Server className={iconSizes[size]} />
        {children || 'Configurar VPS'}
      </button>

      <VPSSetupModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};