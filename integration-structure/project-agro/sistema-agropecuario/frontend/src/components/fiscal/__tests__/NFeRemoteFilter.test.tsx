import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NFeRemoteFilter } from '../NFeRemoteFilter';

/**
 * TEST_DEFINITION - NFeRemoteFilter Component
 * Purpose: Toggle between local and remote NFes in NFeList
 * Acceptance Criteria:
 * - Renders toggle button with labels "Locais" / "Remotas"
 * - Default: local NFes displayed (showRemote=false)
 * - Clicking toggle: switches between local ↔ remote
 * - Calls onToggle callback with boolean value
 * - Shows badge count if provided
 */

describe('NFeRemoteFilter', () => {
  it('should render toggle with "Locais" label by default', () => {
    const mockOnToggle = jest.fn();
    render(<NFeRemoteFilter showRemote={false} onToggle={mockOnToggle} remoteCount={0} />);
    
    expect(screen.getByText(/Locais/i)).toBeInTheDocument();
  });

  it('should render toggle with "Remotas" label when showRemote=true', () => {
    const mockOnToggle = jest.fn();
    render(<NFeRemoteFilter showRemote={true} onToggle={mockOnToggle} remoteCount={5} />);
    
    expect(screen.getByText(/Remotas/i)).toBeInTheDocument();
  });

  it('should display remote count badge', () => {
    const mockOnToggle = jest.fn();
    render(<NFeRemoteFilter showRemote={false} onToggle={mockOnToggle} remoteCount={3} />);
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should call onToggle when toggle button clicked', async () => {
    const mockOnToggle = jest.fn();
    render(<NFeRemoteFilter showRemote={false} onToggle={mockOnToggle} remoteCount={0} />);
    
    const toggleBtn = screen.getByRole('button', { name: /toggle|Locais|switch/i });
    fireEvent.click(toggleBtn);
    
    await waitFor(() => {
      expect(mockOnToggle).toHaveBeenCalledWith(true);
    });
  });

  it('should toggle back to local when clicked again', async () => {
    const mockOnToggle = jest.fn();
    render(
      <NFeRemoteFilter showRemote={true} onToggle={mockOnToggle} remoteCount={5} />
    );
    
    const toggleBtn = screen.getByRole('button', { name: /toggle|Remotas|switch/i });
    fireEvent.click(toggleBtn);
    
    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });

  it('should disable toggle if remoteCount=0 and showRemote=false', () => {
    const mockOnToggle = jest.fn();
    render(<NFeRemoteFilter showRemote={false} onToggle={mockOnToggle} remoteCount={0} />);
    
    const toggleBtn = screen.getByRole('button');
    expect(toggleBtn).toBeDisabled();
  });
});
