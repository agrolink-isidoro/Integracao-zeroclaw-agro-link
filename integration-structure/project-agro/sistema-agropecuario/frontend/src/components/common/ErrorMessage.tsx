import React from 'react';

interface ErrorMessageProps {
  message: string | null | undefined;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  className = ''
}) => {
  if (!message) return null;

  return (
    <div className={`text-red-600 text-sm mt-1 ${className}`}>
      {message}
    </div>
  );
};

export default ErrorMessage;