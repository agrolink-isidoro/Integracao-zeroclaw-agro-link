import { render, fireEvent, waitFor } from '@testing-library/react';
import UploadZone from '../UploadZone';

describe('UploadZone', () => {
  test('renders upload zone with correct messaging', () => {
    const { getByText } = render(
      <UploadZone onFilesSelect={() => {}} acceptedTypes={['.xml']} />
    );

    expect(getByText(/Arraste arquivos aqui/i)).toBeTruthy();
    expect(getByText(/\.xml/)).toBeTruthy();
  });

  test('calls onFilesSelect when valid files are dropped', async () => {
    const onFilesSelect = jest.fn();
    const { container } = render(
      <UploadZone onFilesSelect={onFilesSelect} acceptedTypes={['.xml']} />
    );

    const zone = container.querySelector('div[role="button"]') as HTMLDivElement;
    const file = new File(['<xml/>'], 'nota.xml', { type: 'text/xml' });

    fireEvent.dragEnter(zone, { dataTransfer: { files: [file] } });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(onFilesSelect).toHaveBeenCalledWith([file]);
    });
  });

  test('filters invalid file types on drop', async () => {
    const onFilesSelect = jest.fn();
    const { container } = render(
      <UploadZone onFilesSelect={onFilesSelect} acceptedTypes={['.xml']} />
    );

    const zone = container.querySelector('div[role="button"]') as HTMLDivElement;
    const validFile = new File(['<xml/>'], 'nota.xml', { type: 'text/xml' });
    const invalidFile = new File(['text'], 'file.txt', { type: 'text/plain' });

    fireEvent.drop(zone, { dataTransfer: { files: [validFile, invalidFile] } });

    await waitFor(() => {
      expect(onFilesSelect).toHaveBeenCalledWith([validFile]);
    });
  });

  test('handles file selection via click', async () => {
    const onFilesSelect = jest.fn();
    const { container } = render(
      <UploadZone onFilesSelect={onFilesSelect} acceptedTypes={['.xml']} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['<xml/>'], 'nota.xml', { type: 'text/xml' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onFilesSelect).toHaveBeenCalledWith([file]);
    });
  });

  test('handles drag over with visual feedback', async () => {
    const onDragOver = jest.fn();
    const { container } = render(
      <UploadZone
        onFilesSelect={() => {}}
        acceptedTypes={['.xml']}
        onDragOver={onDragOver}
      />
    );

    const zone = container.querySelector('div[role="button"]') as HTMLDivElement;

    fireEvent.dragEnter(zone);
    await waitFor(() => {
      expect(onDragOver).toHaveBeenCalledWith(true);
    });

    fireEvent.dragLeave(zone, { currentTarget: zone });
    await waitFor(() => {
      expect(onDragOver).toHaveBeenCalledWith(false);
    });
  });

  test('respects maxSize validation', async () => {
    const onFilesSelect = jest.fn();
    const { container } = render(
      <UploadZone
        onFilesSelect={onFilesSelect}
        acceptedTypes={['.xml']}
        maxSize={1024}
      />
    );

    const zone = container.querySelector('div[role="button"]') as HTMLDivElement;
    // Create file larger than 1KB
    const largeFile = new File(['x'.repeat(2000)], 'large.xml', {
      type: 'text/xml',
    });

    fireEvent.drop(zone, { dataTransfer: { files: [largeFile] } });

    await waitFor(() => {
      expect(onFilesSelect).not.toHaveBeenCalled();
    });
  });

  test('click button inside zone works to open file picker', async () => {
    const { container } = render(
      <UploadZone onFilesSelect={() => {}} acceptedTypes={['.xml']} />
    );

    const button = container.querySelector('button.btn-primary') as HTMLButtonElement;
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const clickSpy = jest.spyOn(input, 'click');
    fireEvent.click(button);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
