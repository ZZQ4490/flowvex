import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, className = '', color }) => {
  const IconComponent = (LucideIcons as any)[name];
  
  if (!IconComponent) {
    return <span className={className}>?</span>;
  }
  
  return <IconComponent size={size} className={className} color={color} />;
};
