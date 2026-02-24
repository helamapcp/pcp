import React from 'react';
import { cn } from '@/lib/utils';

interface IndustrialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
}

export const IndustrialButton = React.forwardRef<HTMLButtonElement, IndustrialButtonProps>(
  ({ variant = 'primary', size = 'md', icon, className, children, ...props }, ref) => {
    const baseStyles = 'font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-95';

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-lg hover:shadow-xl',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 shadow-lg hover:shadow-xl',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-lg hover:shadow-xl',
      success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-lg hover:shadow-xl',
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm min-h-10',
      md: 'px-6 py-3 text-base min-h-12',
      lg: 'px-8 py-4 text-lg min-h-14',
      xl: 'px-10 py-5 text-xl min-h-16 w-full',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  }
);

IndustrialButton.displayName = 'IndustrialButton';
