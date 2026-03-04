import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface ModalFormProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const ModalForm: React.FC<ModalFormProps> = ({
  isOpen,
  title,
  onClose,
  children,
  size = 'md'
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'modal-sm',
    md: '',
    lg: 'modal-lg',
    xl: 'modal-xl'
  };

  return (
    <>
      <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${sizeClasses[size]}`}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalForm;