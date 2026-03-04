import React from 'react';
import { Alert, Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ManifestacaoToastProps {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  onClose: () => void;
  autoHideDuration?: number;
}

export const ManifestacaoToast: React.FC<ManifestacaoToastProps> = ({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = 6000
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        severity={severity}
        onClose={onClose}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={onClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        sx={{
          minWidth: '300px',
          '& .MuiAlert-message': {
            fontSize: '0.875rem',
            fontWeight: 500
          }
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};