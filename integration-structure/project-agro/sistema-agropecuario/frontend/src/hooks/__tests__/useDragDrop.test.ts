import { renderHook } from '@testing-library/react';
import { useDragDrop } from '../useDragDrop';

describe('useDragDrop', () => {
  test('initializes with isDragging as false', () => {
    const { result } = renderHook(() => useDragDrop());
    expect(result.current.isDragging).toBe(false);
  });

  test('registers event listeners on mount', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    renderHook(() => useDragDrop());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'dragenter',
      expect.any(Function)
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'dragleave',
      expect.any(Function)
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'dragover',
      expect.any(Function)
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'drop',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
  });

  test('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useDragDrop());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'dragenter',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'dragleave',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'dragover',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'drop',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  test('hook is exported and usable', () => {
    const onFilesDragged = jest.fn();
    const { result } = renderHook(() =>
      useDragDrop({
        onFilesDragged,
        acceptedTypes: ['.xml', '.pfx'],
      })
    );

    expect(result.current).toHaveProperty('isDragging');
    expect(typeof result.current.isDragging).toBe('boolean');
  });

  test('accepts custom acceptedTypes', () => {
    const { result } = renderHook(() =>
      useDragDrop({
        acceptedTypes: ['.custom', '.files'],
      })
    );

    expect(result.current).toBeDefined();
  });

  test('accepts optional onFilesDragged callback', () => {
    const onFilesDragged = jest.fn();
    const { result } = renderHook(() =>
      useDragDrop({
        onFilesDragged,
      })
    );

    expect(result.current).toBeDefined();
  });
});
