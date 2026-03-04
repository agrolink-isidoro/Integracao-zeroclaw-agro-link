import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  // If value is undefined, make it a controlled input with empty string to avoid
  // React warning about uncontrolled -> controlled transitioning.
  const { value, defaultValue, type } = props as any;
  const finalProps = { ...props } as any;
  if (type !== 'file') {
    if (value === undefined && defaultValue === undefined) {
      finalProps.value = '';
    }
  }

  return (
    <div className="mb-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...finalProps}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;