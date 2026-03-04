import api from './api';
import type { Equipamento, CategoriaEquipamento, Abastecimento, Manutencao } from '../types';

// ========================================
// SERVICE DE EQUIPAMENTOS
// ========================================

export interface EquipamentoFilters {
  categoria?: number;
  tipo_mobilidade?: string;
  status?: string;
  search?: string;
  ordering?: string;
}

class EquipamentosService {
  async listar(filters?: EquipamentoFilters): Promise<Equipamento[]> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await api.get(`/maquinas/equipamentos/?${params}`);
    return response.data;
  }

  async obter(id: number): Promise<Equipamento> {
    const response = await api.get(`/maquinas/equipamentos/${id}/`);
    return response.data;
  }

  async criar(equipamento: Omit<Equipamento, 'id'>): Promise<Equipamento> {
    const response = await api.post('/maquinas/equipamentos/', equipamento);
    return response.data;
  }

  async atualizar(id: number, equipamento: Partial<Equipamento>): Promise<Equipamento> {
    const response = await api.patch(`/maquinas/equipamentos/${id}/`, equipamento);
    return response.data;
  }

  async deletar(id: number): Promise<void> {
    await api.delete(`/maquinas/equipamentos/${id}/`);
  }

  // Buscar por categoria
  async buscarPorCategoria(categoriaId: number): Promise<Equipamento[]> {
    const response = await api.get('/maquinas/equipamentos/', {
      params: { categoria: categoriaId }
    });
    return response.data;
  }

  // Buscar por tipo de mobilidade
  async buscarPorMobilidade(tipoMobilidade: string): Promise<Equipamento[]> {
    const response = await api.get('/maquinas/equipamentos/', {
      params: { tipo_mobilidade: tipoMobilidade }
    });
    return response.data;
  }

  // Atualizar horímetro
  async atualizarHorimetro(id: number, horimetro: number): Promise<Equipamento> {
    const response = await api.patch(`/maquinas/equipamentos/${id}/`, {
      horimetro_atual: horimetro
    });
    return response.data;
  }
}

// ========================================
// SERVICE DE CATEGORIAS
// ========================================

class CategoriasService {
  async listar(): Promise<CategoriaEquipamento[]> {
    const response = await api.get('/maquinas/categorias/');
    return response.data;
  }

  async obter(id: number): Promise<CategoriaEquipamento> {
    const response = await api.get(`/maquinas/categorias/${id}/`);
    return response.data;
  }

  async criar(categoria: Omit<CategoriaEquipamento, 'id'>): Promise<CategoriaEquipamento> {
    const response = await api.post('/maquinas/categorias/', categoria);
    return response.data;
  }

  async atualizar(id: number, categoria: Partial<CategoriaEquipamento>): Promise<CategoriaEquipamento> {
    const response = await api.patch(`/maquinas/categorias/${id}/`, categoria);
    return response.data;
  }

  async deletar(id: number): Promise<void> {
    await api.delete(`/maquinas/categorias/${id}/`);
  }
}

// ========================================
// SERVICE DE ABASTECIMENTOS
// ========================================

class AbastecimentosService {
  async listar(equipamentoId?: number): Promise<Abastecimento[]> {
    const params = equipamentoId ? { equipamento: equipamentoId } : {};
    const response = await api.get('/maquinas/abastecimentos/', { params });
    return response.data;
  }

  async criar(abastecimento: Omit<Abastecimento, 'id'>): Promise<Abastecimento> {
    const response = await api.post('/maquinas/abastecimentos/', abastecimento);
    return response.data;
  }

  async deletar(id: number): Promise<void> {
    await api.delete(`/maquinas/abastecimentos/${id}/`);
  }
}

// ========================================
// SERVICE DE MANUTENÇÕES
// ========================================

class ManutencoesService {
  async listar(equipamentoId?: number): Promise<Manutencao[]> {
    const params = equipamentoId ? { equipamento: equipamentoId } : {};
    const response = await api.get('/maquinas/manutencoes-preventivas/', { params });
    return response.data;
  }

  async criar(manutencao: Omit<Manutencao, 'id'>): Promise<Manutencao> {
    const response = await api.post('/maquinas/manutencoes-preventivas/', manutencao);
    return response.data;
  }

  async atualizar(id: number, manutencao: Partial<Manutencao>): Promise<Manutencao> {
    const response = await api.patch(`/maquinas/manutencoes-preventivas/${id}/`, manutencao);
    return response.data;
  }

  async deletar(id: number): Promise<void> {
    await api.delete(`/maquinas/manutencoes-preventivas/${id}/`);
  }
}

const equipamentosService = new EquipamentosService();
const categoriasService = new CategoriasService();
const abastecimentosService = new AbastecimentosService();
class OrdensService {
  async listar(params?: object) {
    const response = await api.get('/maquinas/ordens-servico/', { params });
    return response.data;
  }

  async criar(ordem: Partial<any>) {
    const response = await api.post('/maquinas/ordens-servico/', ordem);
    return response.data;
  }

  async atualizar(id: number, ordem: Partial<any>) {
    const response = await api.put(`/maquinas/ordens-servico/${id}/`, ordem);
    return response.data;
  }

  async concluir(id: number) {
    const response = await api.post(`/maquinas/ordens-servico/${id}/concluir/`);
    return response.data;
  }
}

const ordensService = new OrdensService();
const manutencoesService = new ManutencoesService();

export {
  equipamentosService,
  categoriasService,
  abastecimentosService,
  manutencoesService,
  ordensService
};
export default equipamentosService;