import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Box, Button, Chip, Tooltip, } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import StorageIcon from '@mui/icons-material/Storage';
/**
 * NFeRemoteFilter Component
 * Toggle between local and remote (distributed) NFes
 * - Shows remote count in badge
 * - Disabled if no remotes available
 * - Integrated into NFeList filter bar
 */
export const NFeRemoteFilter = ({ showRemote, onToggle, remoteCount, }) => {
    const handleToggle = () => {
        onToggle(!showRemote);
    };
    const isDisabled = remoteCount === 0 && !showRemote;
    return (_jsx(Box, { children: _jsx(Tooltip, { title: isDisabled
                ? 'Nenhuma NFe remota disponível'
                : showRemote
                    ? 'Mostrando NFes distribuídas pela SEFAZ'
                    : 'Mostrando NFes locais', children: _jsx("span", { children: _jsxs(Button, { variant: showRemote ? 'contained' : 'outlined', startIcon: showRemote ? _jsx(CloudDownloadIcon, {}) : _jsx(StorageIcon, {}), onClick: handleToggle, disabled: isDisabled, sx: {
                        textTransform: 'none',
                        fontSize: '0.95rem',
                    }, children: [showRemote ? 'Remotas' : 'Locais', remoteCount > 0 && (_jsx(Chip, { label: remoteCount, size: "small", sx: {
                                ml: 1,
                                height: '20px',
                                backgroundColor: showRemote ? 'primary.main' : 'action.hover',
                                color: showRemote ? 'primary.contrastText' : 'text.primary',
                            } }))] }) }) }) }));
};
export default NFeRemoteFilter;
