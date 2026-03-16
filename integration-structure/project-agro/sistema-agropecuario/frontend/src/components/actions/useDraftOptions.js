/**
 * useDraftOptions.ts
 *
 * Hook que carrega as opções de dropdown para campos do draft_data
 * baseado nas sources necessárias para um dado action_type.
 *
 * Usa react-query para cache automático e evitar chamadas duplicadas.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { getRequiredSources } from './draftFieldConfig';
/** Endpoints da API por source */
const SOURCE_ENDPOINTS = {
    equipamentos: '/maquinas/equipamentos/',
    produtos: '/estoque/produtos/',
    fazendas: '/fazendas/',
    areas: '/areas/',
    talhoes: '/talhoes/',
    safras: '/agricultura/plantios/',
    proprietarios: '/proprietarios/',
    categorias_eq: '/maquinas/categorias/',
    locais: '/estoque/locais-armazenamento/',
    static: null, // opções estáticas, não precisa fetch
};
/** Campos para display/value por source */
const SOURCE_DISPLAY_FIELD = {
    equipamentos: { display: 'nome', value: 'nome' },
    produtos: { display: 'nome', value: 'nome' },
    fazendas: { display: 'name', value: 'name' },
    areas: { display: 'name', value: 'name' },
    talhoes: { display: 'name', value: 'name' },
    safras: { display: 'cultura_nome', value: 'cultura_nome' },
    proprietarios: { display: 'nome', value: 'nome' },
    categorias_eq: { display: 'nome', value: 'nome' },
    locais: { display: 'nome', value: 'nome' },
    static: { display: '', value: '' },
};
/** Faz fetch de uma API e extrai as opções */
async function fetchOptions(source) {
    const endpoint = SOURCE_ENDPOINTS[source];
    if (!endpoint)
        return [];
    try {
        const response = await api.get(endpoint);
        const data = response.data;
        const items = data?.results ?? (Array.isArray(data) ? data : []);
        const { display, value } = SOURCE_DISPLAY_FIELD[source];
        return items.map((item) => {
            const displayVal = item[display] || item.nome || item.name || String(item.id);
            const valueVal = item[value] || item.nome || item.name || String(item.id);
            // Para equipamentos, mostrar marca/modelo junto
            let label = displayVal;
            if (source === 'equipamentos' && item.marca) {
                label = `${item.nome} — ${item.marca} ${item.modelo || ''}`.trim();
            }
            // Para safras, mostrar cultura + fazenda
            if (source === 'safras') {
                const cultura = item.cultura_nome || item.cultura || '';
                const fazenda = item.fazenda_nome || '';
                label = fazenda ? `${cultura} (${fazenda})` : cultura;
            }
            return { value: String(valueVal), label };
        });
    }
    catch {
        return [];
    }
}
/**
 * Hook para carregar opções de dropdown por action_type.
 *
 * Retorna um mapa source → SelectOption[].
 * Só carrega as sources realmente necessárias para o action_type.
 */
export function useDraftOptions(actionType) {
    const requiredSources = actionType ? getRequiredSources(actionType) : [];
    // Fetch all required sources in parallel using a single query
    const { data, isLoading } = useQuery({
        queryKey: ['draft-options', ...requiredSources.sort()],
        queryFn: async () => {
            const entries = await Promise.all(requiredSources.map(async (source) => {
                const options = await fetchOptions(source);
                return [source, options];
            }));
            const map = {};
            for (const [source, options] of entries) {
                map[source] = options;
            }
            return map;
        },
        enabled: requiredSources.length > 0,
        staleTime: 60_000, // cache 1 min
        gcTime: 5 * 60_000,
    });
    const emptyMap = {};
    return {
        optionsMap: data ?? emptyMap,
        isLoading,
    };
}
