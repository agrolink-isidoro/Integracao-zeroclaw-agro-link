import { downloadCSV } from '../csv';

describe('downloadCSV', () => {
  it('calls createObjectURL, click and revokeObjectURL with correct filename', () => {
    // Provide URL.createObjectURL / revokeObjectURL in test environment if missing
    const origURL = (globalThis as any).URL;
    (globalThis as any).URL = { createObjectURL: jest.fn(() => 'blob:fake'), revokeObjectURL: jest.fn() };

    const clickMock = jest.fn();
    const anchor = { href: '', download: '', click: clickMock } as any;
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation(() => anchor as any);

    downloadCSV('test.csv', 'a,b,c');

    expect((globalThis as any).URL.createObjectURL).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('test.csv');
    expect(clickMock).toHaveBeenCalled();
    expect((globalThis as any).URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');

    createElementSpy.mockRestore();
    (globalThis as any).URL = origURL;
  });
});