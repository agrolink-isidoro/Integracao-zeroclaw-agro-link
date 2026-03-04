import React from 'react';
import type { ActionStatus } from '../../services/actions';
import { ACTION_STATUS_LABELS, ACTION_STATUS_COLORS } from '../../services/actions';

interface ActionStatusBadgeProps {
  status: ActionStatus;
  className?: string;
}

const ActionStatusBadge: React.FC<ActionStatusBadgeProps> = ({ status, className = '' }) => {
  const color = ACTION_STATUS_COLORS[status] ?? 'secondary';
  const label = ACTION_STATUS_LABELS[status] ?? status;

  return (
    <span className={`badge bg-${color} ${className}`}>
      {label}
    </span>
  );
};

export default ActionStatusBadge;
