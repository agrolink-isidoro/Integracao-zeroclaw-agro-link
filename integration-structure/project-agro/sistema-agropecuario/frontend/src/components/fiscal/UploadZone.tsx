import React, { useState, useRef } from 'react';

interface UploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSize?: number; // em bytes
  isDraggingOver?: boolean;
  onDragOver?: (isDragging: boolean) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelect,
  acceptedTypes = ['.xml', '.pfx', '.p12'],
  maxSize = 50 * 1024 * 1024, // 50MB default
  isDraggingOver = false,
  onDragOver,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
    onDragOver?.(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the zone entirely
    if (e.currentTarget === e.target) {
      setDragOver(false);
      onDragOver?.(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFiles = (files: File[]): File[] => {
    return files.filter((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return acceptedTypes.includes(ext) && file.size <= maxSize;
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    onDragOver?.(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const isActive = dragOver || isDraggingOver;

  const zoneStyles: React.CSSProperties = {
    border: `2px dashed ${isActive ? '#28a745' : '#dee2e6'}`,
    borderRadius: '8px',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: isActive ? '#d4edda' : '#f8f9fa',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const contentStyles: React.CSSProperties = {
    pointerEvents: 'none',
  };

  const iconStyles: React.CSSProperties = {
    fontSize: '2.5rem',
    color: '#0d6efd',
    marginBottom: '1rem',
    display: 'block',
  };

  const titleStyles: React.CSSProperties = {
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem',
    color: '#212529',
    fontWeight: 600,
  };

  const subtitleStyles: React.CSSProperties = {
    margin: '0.5rem 0',
    fontSize: '0.9rem',
    color: '#6c757d',
  };

  const sizeStyles: React.CSSProperties = {
    margin: '0.5rem 0 0 0',
    fontSize: '0.85rem',
    color: '#999',
  };

  return (
    <div
      style={zoneStyles}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        accept={acceptedTypes.join(',')}
      />

      <div style={contentStyles}>
        <div style={iconStyles}>
          <i className="bi bi-cloud-arrow-up"></i>
        </div>
        <h4 style={titleStyles}>
          Arraste arquivos aqui ou clique para selecionar
        </h4>
        <p style={subtitleStyles}>
          Formatos suportados: {acceptedTypes.join(', ')}
        </p>
        <p style={sizeStyles}>
          Tamanho máximo: {(maxSize / (1024 * 1024)).toFixed(0)}MB
        </p>
        <button
          type="button"
          className="btn btn-primary mt-3"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          <i className="bi bi-folder-open me-2"></i>
          Selecionar Arquivo
        </button>
      </div>
    </div>
  );
};

export default UploadZone;
