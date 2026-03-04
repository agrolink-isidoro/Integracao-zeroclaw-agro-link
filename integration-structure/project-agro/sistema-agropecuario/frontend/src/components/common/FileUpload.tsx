import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, FileText, File } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // em MB
  maxFiles?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
  label?: string;
  description?: string;
  resetKey?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = '.pdf,.xml,.txt',
  multiple = false,
  maxSize = 10, // 10MB
  maxFiles = 5,
  disabled = false,
  error,
  className = '',
  label = 'Selecionar arquivos',
  description = 'Arraste e solte arquivos aqui ou clique para selecionar',
  resetKey,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When parent wants to reset selection, clear internal state and file input
  useEffect(() => {
    if (typeof resetKey !== 'undefined') {
      setSelectedFiles([]);
      try {
        // Call onFileSelect with empty array when parent requested reset
        onFileSelect([]);
      } catch (e) {
        // ignore
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    // Intentionally not including `onFileSelect` in deps to avoid resetting
    // on every parent render (parent may pass inline callback). We only want to
    // react when `resetKey` changes. This is safe as onFileSelect is stable in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    const validateFile = (file: File): string | null => {
      // Verificar tamanho
      if (file.size > maxSize * 1024 * 1024) {
        return `Arquivo muito grande. Máximo: ${maxSize}MB`;
      }

      // Verificar tipo se especificado
      if (accept && accept !== '*') {
        const acceptedTypes = accept.split(',').map(type => type.trim());
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return fileName.endsWith(type);
          }
          return fileType === type || fileType.startsWith(type.replace('*', ''));
        });

        if (!isAccepted) {
          return `Tipo de arquivo não aceito. Use: ${accept}`;
        }
      }

      return null;
    };

    // Validar arquivos
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Verificar limite de arquivos
    if (multiple && selectedFiles.length + validFiles.length > maxFiles) {
      errors.push(`Máximo de ${maxFiles} arquivos permitido`);
      return;
    }

    // Mostrar erros se houver
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    // Atualizar estado
    const newFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles;
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  }, [selectedFiles, multiple, maxFiles, onFileSelect, maxSize, accept]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'xml':
        return <File className="w-8 h-8 text-blue-500" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Área de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className={`mx-auto h-12 w-12 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
        <div className="mt-4">
          <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tipos aceitos: {accept} • Máx: {maxSize}MB por arquivo
            {multiple && ` • Até ${maxFiles} arquivos`}
          </p>
        </div>
      </div>

      {/* Input hidden */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Lista de arquivos selecionados */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Arquivos selecionados:</h4>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(file.name)}
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700 p-1"
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FileUpload;