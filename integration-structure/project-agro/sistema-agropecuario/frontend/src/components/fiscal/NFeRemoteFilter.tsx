import React from 'react';
import {
  Box,
  Button,
  Chip,
  Tooltip,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import StorageIcon from '@mui/icons-material/Storage';

interface NFeRemoteFilterProps {
  showRemote: boolean;
  onToggle: (showRemote: boolean) => void;
  remoteCount: number;
}

/**
 * NFeRemoteFilter Component
 * Toggle between local and remote (distributed) NFes
 * - Shows remote count in badge
 * - Disabled if no remotes available
 * - Integrated into NFeList filter bar
 */
export const NFeRemoteFilter: React.FC<NFeRemoteFilterProps> = ({
  showRemote,
  onToggle,
  remoteCount,
}) => {
  const handleToggle = () => {
    onToggle(!showRemote);
  };

  const isDisabled = remoteCount === 0 && !showRemote;

  return (
    <Box>
      <Tooltip
        title={
          isDisabled
            ? 'Nenhuma NFe remota disponível'
            : showRemote
              ? 'Mostrando NFes distribuídas pela SEFAZ'
              : 'Mostrando NFes locais'
        }
      >
        <span>
          <Button
            variant={showRemote ? 'contained' : 'outlined'}
            startIcon={showRemote ? <CloudDownloadIcon /> : <StorageIcon />}
            onClick={handleToggle}
            disabled={isDisabled}
            sx={{
              textTransform: 'none',
              fontSize: '0.95rem',
            }}
          >
            {showRemote ? 'Remotas' : 'Locais'}
            {remoteCount > 0 && (
              <Chip
                label={remoteCount}
                size="small"
                sx={{
                  ml: 1,
                  height: '20px',
                  backgroundColor: showRemote ? 'primary.main' : 'action.hover',
                  color: showRemote ? 'primary.contrastText' : 'text.primary',
                }}
              />
            )}
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
};

export default NFeRemoteFilter;
