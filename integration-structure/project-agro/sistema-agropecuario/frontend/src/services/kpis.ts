import api from './api';
import type { SafraKPIs } from '../types/kpis';

interface PlantioListItem {
  id: number;
  cultura_nome: string;
  fazenda_nome: string;
  nome_safra: string;
  status: string;
  data_plantio: string;
  area_total_ha: number;
}

/**
 * Serviço de KPIs de Safra — usa a instância axios `api` com JWT e baseURL /api/.
 */
const KpisService = {
  /** Busca KPIs agregados de uma safra (plantio) */
  async getSafraKPIs(safraId: number): Promise<SafraKPIs> {
    const response = await api.get<SafraKPIs>(`/agricultura/plantios/${safraId}/kpis/`);
    return response.data;
  },

  /** Lista safras (plantios) para o seletor */
  async listSafras(): Promise<PlantioListItem[]> {
    const response = await api.get('/agricultura/plantios/');
    // Normalize paginated DRF response
    const data = response.data;
    return data.results ?? data;
  },
};

export type { PlantioListItem };
export default KpisService;
