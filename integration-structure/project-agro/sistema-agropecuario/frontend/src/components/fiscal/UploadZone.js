import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef } from 'react';
const UploadZone = ({ onFilesSelect, acceptedTypes = ['.xml', '.pfx', '.p12'], maxSize = 50 * 1024 * 1024, // 50MB default
isDraggingOver = false, onDragOver, }) => {
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
        onDragOver?.(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set to false if leaving the zone entirely
        if (e.currentTarget === e.target) {
            setDragOver(false);
            onDragOver?.(false);
        }
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const validateFiles = (files) => {
        return files.filter((file) => {
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            return acceptedTypes.includes(ext) && file.size <= maxSize;
        });
    };
    const handleDrop = (e) => {
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
    const handleFileInputChange = (e) => {
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
    const zoneStyles = {
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
    const contentStyles = {
        pointerEvents: 'none',
    };
    const iconStyles = {
        fontSize: '2.5rem',
        color: '#0d6efd',
        marginBottom: '1rem',
        display: 'block',
    };
    const titleStyles = {
        margin: '0 0 0.5rem 0',
        fontSize: '1.1rem',
        color: '#212529',
        fontWeight: 600,
    };
    const subtitleStyles = {
        margin: '0.5rem 0',
        fontSize: '0.9rem',
        color: '#6c757d',
    };
    const sizeStyles = {
        margin: '0.5rem 0 0 0',
        fontSize: '0.85rem',
        color: '#999',
    };
    return (_jsxs("div", { style: zoneStyles, onDragEnter: handleDragEnter, onDragLeave: handleDragLeave, onDragOver: handleDragOver, onDrop: handleDrop, onClick: handleClick, role: "button", tabIndex: 0, onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                handleClick();
            }
        }, children: [_jsx("input", { ref: fileInputRef, type: "file", multiple: true, onChange: handleFileInputChange, style: { display: 'none' }, accept: acceptedTypes.join(',') }), _jsxs("div", { style: contentStyles, children: [_jsx("div", { style: iconStyles, children: _jsx("i", { className: "bi bi-cloud-arrow-up" }) }), _jsx("h4", { style: titleStyles, children: "Arraste arquivos aqui ou clique para selecionar" }), _jsxs("p", { style: subtitleStyles, children: ["Formatos suportados: ", acceptedTypes.join(', ')] }), _jsxs("p", { style: sizeStyles, children: ["Tamanho m\u00E1ximo: ", (maxSize / (1024 * 1024)).toFixed(0), "MB"] }), _jsxs("button", { type: "button", className: "btn btn-primary mt-3", onClick: (e) => {
                            e.stopPropagation();
                            handleClick();
                        }, children: [_jsx("i", { className: "bi bi-folder-open me-2" }), "Selecionar Arquivo"] })] })] }));
};
export default UploadZone;
