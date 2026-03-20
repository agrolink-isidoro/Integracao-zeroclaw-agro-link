import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Alert, Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
export const ManifestacaoToast = ({ open, message, severity, onClose, autoHideDuration = 6000 }) => {
    return (_jsx(Snackbar, { open: open, autoHideDuration: autoHideDuration, onClose: onClose, anchorOrigin: { vertical: 'top', horizontal: 'right' }, children: _jsx(Alert, { severity: severity, onClose: onClose, action: _jsx(IconButton, { size: "small", "aria-label": "close", color: "inherit", onClick: onClose, children: _jsx(CloseIcon, { fontSize: "small" }) }), sx: {
                minWidth: '300px',
                '& .MuiAlert-message': {
                    fontSize: '0.875rem',
                    fontWeight: 500
                }
            }, children: message }) }));
};
