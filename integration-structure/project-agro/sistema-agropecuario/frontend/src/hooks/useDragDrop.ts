import { useEffect, useRef, useState } from 'react';

interface UseDragDropOptions {
  onFilesDragged?: (files: File[]) => void;
  acceptedTypes?: string[];
}

export const useDragDrop = (options: UseDragDropOptions = {}) => {
  const { onFilesDragged, acceptedTypes = ['.xml', '.pfx', '.p12'] } = options;
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      if (e.dataTransfer?.files) {
        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter((file) => {
          const ext = '.' + file.name.split('.').pop()?.toLowerCase();
          return acceptedTypes.includes(ext);
        });

        if (validFiles.length > 0) {
          onFilesDragged?.(validFiles);
        }
      }
    };

    // Add listeners to window/document
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [acceptedTypes, onFilesDragged]);

  return { isDragging };
};
