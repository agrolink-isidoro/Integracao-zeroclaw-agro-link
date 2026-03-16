import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, FileText, File } from 'lucide-react';
const FileUpload = ({ onFileSelect, accept = '.pdf,.xml,.txt', multiple = false, maxSize = 10, // 10MB
maxFiles = 5, disabled = false, error, className = '', label = 'Selecionar arquivos', description = 'Arraste e solte arquivos aqui ou clique para selecionar', resetKey, }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);
    // When parent wants to reset selection, clear internal state and file input
    useEffect(() => {
        if (typeof resetKey !== 'undefined') {
            setSelectedFiles([]);
            try {
                // Call onFileSelect with empty array when parent requested reset
                onFileSelect([]);
            }
            catch (e) {
                // ignore
            }
            if (fileInputRef.current)
                fileInputRef.current.value = '';
        }
        // Intentionally not including `onFileSelect` in deps to avoid resetting
        // on every parent render (parent may pass inline callback). We only want to
        // react when `resetKey` changes. This is safe as onFileSelect is stable in practice.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);
    const handleFileSelect = useCallback((files) => {
        if (!files)
            return;
        const fileArray = Array.from(files);
        const validFiles = [];
        const errors = [];
        const validateFile = (file) => {
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
            }
            else {
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
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);
    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);
    const removeFile = (index) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        onFileSelect(newFiles);
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return _jsx(FileText, { className: "w-8 h-8 text-red-500" });
            case 'xml':
                return _jsx(File, { className: "w-8 h-8 text-blue-500" });
            default:
                return _jsx(File, { className: "w-8 h-8 text-gray-500" });
        }
    };
    return (_jsxs("div", { className: `space-y-4 ${className}`, children: [label && (_jsx("label", { className: "block text-sm font-medium text-gray-700", children: label })), _jsxs("div", { onDrop: handleDrop, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onClick: () => !disabled && fileInputRef.current?.click(), className: `border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragOver
                    ? 'border-blue-400 bg-blue-50'
                    : disabled
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 hover:border-gray-400'}`, children: [_jsx(Upload, { className: `mx-auto h-12 w-12 ${disabled ? 'text-gray-300' : 'text-gray-400'}` }), _jsxs("div", { className: "mt-4", children: [_jsx("p", { className: `text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`, children: description }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Tipos aceitos: ", accept, " \u2022 M\u00E1x: ", maxSize, "MB por arquivo", multiple && ` • Até ${maxFiles} arquivos`] })] })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: accept, multiple: multiple, onChange: (e) => handleFileSelect(e.target.files), className: "hidden", disabled: disabled }), selectedFiles.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-sm font-medium text-gray-700", children: "Arquivos selecionados:" }), selectedFiles.map((file, index) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [getFileIcon(file.name), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: file.name }), _jsx("p", { className: "text-xs text-gray-500", children: formatFileSize(file.size) })] })] }), _jsx("button", { onClick: () => removeFile(index), className: "text-red-500 hover:text-red-700 p-1", disabled: disabled, children: _jsx(X, { className: "w-4 h-4" }) })] }, index)))] })), error && (_jsx("p", { className: "text-sm text-red-600", children: error }))] }));
};
export default FileUpload;
