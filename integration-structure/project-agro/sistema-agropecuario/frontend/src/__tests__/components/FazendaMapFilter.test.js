import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FazendaMap from '../../components/fazendas/FazendaMap';
import { useAuthContext } from '../../contexts/AuthContext';
import * as useGeoDataModule from '../../hooks/useGeoData';
// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../hooks/useGeoData');
jest.mock('@react-google-maps/api', () => ({
    useJsApiLoader: () => ({ isLoaded: true, loadError: null }),
    GoogleMap: ({ children, onLoad }) => {
        React.useEffect(() => {
            // Simulate map load with mock map object
            const mockMap = { fitBounds: jest.fn() };
            onLoad?.(mockMap);
        }, [onLoad]);
        return _jsx("div", { "data-testid": "google-map", children: children });
    },
    Polygon: () => _jsx("div", { "data-testid": "polygon" }),
    Polyline: () => _jsx("div", { "data-testid": "polyline" }),
}));
describe('FazendaMap - Filter + Default Selection (Task 3.2)', () => {
    const mockUser = {
        id: 1,
        name: 'Test User',
        fazenda: 42, // Primary fazenda ID
    };
    const mockGeoFeatures = [
        {
            type: 'Feature',
            id: '1',
            geometry: {
                type: 'Polygon',
                coordinates: [[[-47.9, -15.8], [-47.8, -15.8], [-47.8, -15.7], [-47.9, -15.7], [-47.9, -15.8]]],
            },
            properties: {
                entity_type: 'area',
                id: 1,
                name: 'Area Test 1',
                fazenda_id: 42,
                fazenda_name: 'Fazenda A',
                area_hectares: 100,
            },
        },
        {
            type: 'Feature',
            id: '2',
            geometry: {
                type: 'Polygon',
                coordinates: [[[-47.7, -15.6], [-47.6, -15.6], [-47.6, -15.5], [-47.7, -15.5], [-47.7, -15.6]]],
            },
            properties: {
                entity_type: 'talhao',
                id: 2,
                name: 'Talhão Test 1',
                fazenda_id: 99,
                fazenda_name: 'Fazenda B',
                area_size_ha: 50,
            },
        },
    ];
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock AuthContext
        useAuthContext.mockReturnValue({
            user: mockUser,
            isLoading: false,
            isAuthenticated: true,
        });
        // Mock useGeoData hook
        useGeoDataModule.useGeoData.mockReturnValue({
            data: {
                type: 'FeatureCollection',
                features: mockGeoFeatures,
            },
            isLoading: false,
            error: null,
            fazendaOptions: [
                [42, 'Fazenda A'],
                [99, 'Fazenda B'],
            ],
        });
        // Mock environment
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY = 'test-key';
    });
    test('3.2.1: Dropdown is pre-selected with user primary fazenda on mount', async () => {
        render(_jsx(FazendaMap, {}));
        await waitFor(() => {
            const fazendaSelect = screen.getByDisplayValue('Fazenda A');
            expect(fazendaSelect).toBeInTheDocument();
            expect(fazendaSelect.value).toBe('42');
        });
    });
    test('3.2.2: Query loads with ?fazenda param on initial render', async () => {
        render(_jsx(FazendaMap, {}));
        await waitFor(() => {
            // Verify that useGeoData was called with fazendaId = user's primary fazenda
            expect(useGeoDataModule.useGeoData).toHaveBeenCalledWith(expect.objectContaining({
                layer: 'all',
                fazendaId: '42', // User primary fazenda
            }));
        });
    });
    test('3.2.3: Dropdown value updates when user changes selection', async () => {
        const user = userEvent.setup();
        render(_jsx(FazendaMap, {}));
        // Wait for initial render
        await waitFor(() => {
            const makendaSelect = screen.getByDisplayValue('Fazenda A');
            expect(makendaSelect).toBeInTheDocument();
        });
        // Find and click the fazenda filter select
        const fazendaSelect = screen.getAllByRole('combobox')[1]; // 2nd select (first is layer filter)
        // Change selection to Fazenda B
        await user.selectOption(fazendaSelect, '99');
        // Verify that useGeoData was called again with new fazendaId
        await waitFor(() => {
            expect(useGeoDataModule.useGeoData).toHaveBeenCalledWith(expect.objectContaining({
                layer: 'all',
                fazendaId: '99', // Changed to Fazenda B
            }));
        });
    });
    test('3.2.4: Dropdown can be cleared to show "All fazendas"', async () => {
        const user = userEvent.setup();
        render(_jsx(FazendaMap, {}));
        await waitFor(() => {
            const fazendaSelect = screen.getByDisplayValue('Fazenda A');
            expect(fazendaSelect).toBeInTheDocument();
        });
        // Find fazenda filter select and clear it
        const fazendaSelect = screen.getAllByRole('combobox')[1];
        await user.selectOption(fazendaSelect, '');
        // Verify that useGeoData is called with fazendaId = null (no filter)
        await waitFor(() => {
            expect(useGeoDataModule.useGeoData).toHaveBeenCalledWith(expect.objectContaining({
                layer: 'all',
                fazendaId: null, // All fazendas
            }));
        });
    });
    test('3.2.5: Changing layer filter also respects fazenda selection', async () => {
        const user = userEvent.setup();
        render(_jsx(FazendaMap, {}));
        // Wait for initial render
        await waitFor(() => {
            const fazendaSelect = screen.getByDisplayValue('Fazenda A');
            expect(fazendaSelect).toBeInTheDocument();
        });
        // Change layer to "Talhões"
        const layerSelect = screen.getAllByRole('combobox')[0]; // First select is layer filter
        await user.selectOption(layerSelect, 'talhoes');
        // Verify that useGeoData is called with BOTH layer and fazendaId params
        await waitFor(() => {
            expect(useGeoDataModule.useGeoData).toHaveBeenCalledWith(expect.objectContaining({
                layer: 'talhoes',
                fazendaId: '42', // Primary fazenda still applies
            }));
        });
    });
});
