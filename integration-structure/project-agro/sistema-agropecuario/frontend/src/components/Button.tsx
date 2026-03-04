import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
  // Use Bootstrap button classes to match the app's global styling
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  };
  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  // Use Bootstrap utility classes for layout so icon/text alignment works without Tailwind
  // Ensure pointer cursor is present and default type is 'button' to avoid accidental form submissions
  const baseClasses = `btn d-inline-flex align-items-center ${variantClasses[variant]} ${sizeClasses[size]} cursor-pointer`.trim();

  const finalProps = { type: 'button', ...props } as React.ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      className={`${baseClasses} ${className}`}
      {...finalProps}
    />
  );
};

export default Button;