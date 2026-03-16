import api from './api';
class EquipamentosService {
    async listar(filters) {
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
    async obter(id) {
        const response = await api.get(`/maquinas/equipamentos/${id}/`);
        return response.data;
    }
    async criar(equipamento) {
        const response = await api.post('/maquinas/equipamentos/', equipamento);
        return response.data;
    }
    async atualizar(id, equipamento) {
        const response = await api.patch(`/maquinas/equipamentos/${id}/`, equipamento);
        return response.data;
    }
    async deletar(id) {
        await api.delete(`/maquinas/equipamentos/${id}/`);
    }
    // Buscar por categoria
    async buscarPorCategoria(categoriaId) {
        const response = await api.get('/maquinas/equipamentos/', {
            params: { categoria: categoriaId }
        });
        return response.data;
    }
    // Buscar por tipo de mobilidade
    async buscarPorMobilidade(tipoMobilidade) {
        const response = await api.get('/maquinas/equipamentos/', {
            params: { tipo_mobilidade: tipoMobilidade }
        });
        return response.data;
    }
    // Atualizar horímetro
    async atualizarHorimetro(id, horimetro) {
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
    async listar() {
        const response = await api.get('/maquinas/categorias/');
        return response.data;
    }
    async obter(id) {
        const response = await api.get(`/maquinas/categorias/${id}/`);
        return response.data;
    }
    async criar(categoria) {
        const response = await api.post('/maquinas/categorias/', categoria);
        return response.data;
    }
    async atualizar(id, categoria) {
        const response = await api.patch(`/maquinas/categorias/${id}/`, categoria);
        return response.data;
    }
    async deletar(id) {
        await api.delete(`/maquinas/categorias/${id}/`);
    }
}
// ========================================
// SERVICE DE ABASTECIMENTOS
// ========================================
class AbastecimentosService {
    async listar(equipamentoId) {
        const params = equipamentoId ? { equipamento: equipamentoId } : {};
        const response = await api.get('/maquinas/abastecimentos/', { params });
        return response.data;
    }
    async criar(abastecimento) {
        const response = await api.post('/maquinas/abastecimentos/', abastecimento);
        return response.data;
    }
    async deletar(id) {
        await api.delete(`/maquinas/abastecimentos/${id}/`);
    }
}
// ========================================
// SERVICE DE MANUTENÇÕES
// ========================================
class ManutencoesService {
    async listar(equipamentoId) {
        const params = equipamentoId ? { equipamento: equipamentoId } : {};
        const response = await api.get('/maquinas/manutencoes-preventivas/', { params });
        return response.data;
    }
    async criar(manutencao) {
        const response = await api.post('/maquinas/manutencoes-preventivas/', manutencao);
        return response.data;
    }
    async atualizar(id, manutencao) {
        const response = await api.patch(`/maquinas/manutencoes-preventivas/${id}/`, manutencao);
        return response.data;
    }
    async deletar(id) {
        await api.delete(`/maquinas/manutencoes-preventivas/${id}/`);
    }
}
const equipamentosService = new EquipamentosService();
const categoriasService = new CategoriasService();
const abastecimentosService = new AbastecimentosService();
class OrdensService {
    async listar(params) {
        const response = await api.get('/maquinas/ordens-servico/', { params });
        return response.data;
    }
    async criar(ordem) {
        const response = await api.post('/maquinas/ordens-servico/', ordem);
        return response.data;
    }
    async atualizar(id, ordem) {
        const response = await api.put(`/maquinas/ordens-servico/${id}/`, ordem);
        return response.data;
    }
    async concluir(id) {
        const response = await api.post(`/maquinas/ordens-servico/${id}/concluir/`);
        return response.data;
    }
}
const ordensService = new OrdensService();
const manutencoesService = new ManutencoesService();
export { equipamentosService, categoriasService, abastecimentosService, manutencoesService, ordensService };
export default equipamentosService;
