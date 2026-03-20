import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import FileUpload from '../FileUpload';
describe('FileUpload', () => {
    test('calls onFileSelect when a file is chosen and clears on resetKey change', async () => {
        const onFileSelect = jest.fn();
        const { container, rerender } = render(_jsx(FileUpload, { onFileSelect: onFileSelect, accept: ".xml", multiple: false, label: "Arquivo XML" }));
        const input = container.querySelector('input[type="file"]');
        const file = new File(['<xml></xml>'], 'nota.xml', { type: 'text/xml' });
        // simulate file selection
        fireEvent.change(input, { target: { files: [file] } });
        expect(onFileSelect).toHaveBeenCalledTimes(1);
        expect(onFileSelect).toHaveBeenCalledWith([file]);
        // UI should show file name
        expect(screen.getByText('nota.xml')).toBeInTheDocument();
        // trigger reset by changing resetKey prop
        rerender(_jsx(FileUpload, { onFileSelect: onFileSelect, accept: ".xml", multiple: false, label: "Arquivo XML", resetKey: 1 }));
        // onFileSelect should be called with empty array
        // Note: component calls onFileSelect([]) when resetKey changes
        expect(onFileSelect).toHaveBeenCalledWith([]);
        // file name should no longer be in the document
        expect(screen.queryByText('nota.xml')).not.toBeInTheDocument();
    });
});
