import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'default' | 'light';
}

const sizeMap = {
  sm: { icon: 24, text: 'text-sm', gap: 'gap-1.5' },
  md: { icon: 32, text: 'text-lg', gap: 'gap-2' },
  lg: { icon: 48, text: 'text-2xl', gap: 'gap-3' },
  xl: { icon: 64, text: 'text-3xl', gap: 'gap-4' },
};

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showText = true,
  className = '',
  variant = 'default',
}) => {
  const { icon, text, gap } = sizeMap[size];
  
  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {/* Logo Icon - Abstract Flow Symbol */}
      <svg 
        width={icon} 
        height={icon} 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="flowvex-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        {/* Background Circle */}
        <circle cx="24" cy="24" r="22" fill="url(#flowvex-gradient)" />
        {/* Flow Lines - representing workflow connections */}
        <path 
          d="M12 24 L20 24 L24 18 L28 30 L32 24 L36 24" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
        {/* Node dots */}
        <circle cx="12" cy="24" r="2.5" fill="white" />
        <circle cx="36" cy="24" r="2.5" fill="white" />
      </svg>
      
      {showText && (
        <span className={`font-bold ${text} ${
          variant === 'light' 
            ? 'text-white' 
            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent'
        }`}>
          Flowvex
        </span>
      )}
    </div>
  );
};

export const PRODUCT_NAME = 'Flowvex';
export const PRODUCT_TAGLINE = '智能工作流，让自动化更简单';
export const PRODUCT_DESCRIPTION = 'AI驱动的可视化工作流自动化平台';
