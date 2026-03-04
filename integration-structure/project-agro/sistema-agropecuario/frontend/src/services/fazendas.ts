import api from './api';
import type { 
  Fazenda, Talhao, Proprietario, Area, Arrendamento, CotacaoSaca,
  DocumentoArrendamento, ParcelaArrendamento
} from '../types';

export const fazendasService = {
  // Proprietários
  async getProprietarios(): Promise<Proprietario[]> {
    const response = await api.get('/proprietarios/');
    return response.data;
  },

  async getProprietario(id: number): Promise<Proprietario> {
    const response = await api.get(`/proprietarios/${id}/`);
    return response.data;
  },

  async createProprietario(data: Partial<Proprietario>): Promise<Proprietario> {
    const response = await api.post('/proprietarios/', data);
    return response.data;
  },

  async updateProprietario(id: number, data: Partial<Proprietario>): Promise<Proprietario> {
    const response = await api.put(`/proprietarios/${id}/`, data);
    return response.data;
  },

  async deleteProprietario(id: number): Promise<void> {
    await api.delete(`/proprietarios/${id}/`);
  },

  // Fazendas
  async getFazendas(): Promise<Fazenda[]> {
    const response = await api.get('/fazendas/');
    return response.data;
  },

  async getFazenda(id: number): Promise<Fazenda> {
    const response = await api.get(`/fazendas/${id}/`);
    return response.data;
  },

  async createFazenda(data: Partial<Fazenda>): Promise<Fazenda> {
    const response = await api.post('/fazendas/', data);
    return response.data;
  },

  async updateFazenda(id: number, data: Partial<Fazenda>): Promise<Fazenda> {
    const response = await api.put(`/fazendas/${id}/`, data);
    return response.data;
  },

  async deleteFazenda(id: number): Promise<void> {
    await api.delete(`/fazendas/${id}/`);
  },

  // Áreas
  async getAreas(fazendaId?: number): Promise<Area[]> {
    const url = fazendaId ? `/areas/?fazenda=${fazendaId}` : '/areas/';
    const response = await api.get(url);
    return response.data;
  },

  async getArea(id: number): Promise<Area> {
    const response = await api.get(`/areas/${id}/`);
    return response.data;
  },

  async createArea(data: Partial<Area>): Promise<Area> {
    const response = await api.post('/areas/', data);
    return response.data;
  },

  async updateArea(id: number, data: Partial<Area>): Promise<Area> {
    const response = await api.put(`/areas/${id}/`, data);
    return response.data;
  },

  async deleteArea(id: number): Promise<void> {
    await api.delete(`/areas/${id}/`);
  },

  // Talhões
  async getTalhoes(fazendaId?: number): Promise<Talhao[]> {
    const url = fazendaId ? `/talhoes/?fazenda=${fazendaId}` : '/talhoes/';
    const response = await api.get(url);
    return response.data;
  },

  async getTalhao(id: number): Promise<Talhao> {
    const response = await api.get(`/talhoes/${id}/`);
    return response.data;
  },

  async createTalhao(data: Partial<Talhao>): Promise<Talhao> {
    const response = await api.post('/talhoes/', data);
    return response.data;
  },

  async updateTalhao(id: number, data: Partial<Talhao>): Promise<Talhao> {
    const response = await api.put(`/talhoes/${id}/`, data);
    return response.data;
  },

  async deleteTalhao(id: number): Promise<void> {
    await api.delete(`/talhoes/${id}/`);
  },

  // Arrendamentos
  async getArrendamentos(fazendaId?: number): Promise<Arrendamento[]> {
    const url = fazendaId ? `/arrendamentos/?fazenda=${fazendaId}` : '/arrendamentos/';
    const response = await api.get(url);
    return response.data;
  },

  async getArrendamento(id: number): Promise<Arrendamento> {
    const response = await api.get(`/arrendamentos/${id}/`);
    return response.data;
  },

  async createArrendamento(data: Partial<Arrendamento>): Promise<Arrendamento> {
    const response = await api.post('/arrendamentos/', data);
    return response.data;
  },

  async updateArrendamento(id: number, data: Partial<Arrendamento>): Promise<Arrendamento> {
    const response = await api.put(`/arrendamentos/${id}/`, data);
    return response.data;
  },

  async deleteArrendamento(id: number): Promise<void> {
    await api.delete(`/arrendamentos/${id}/`);
  },

  // Cotações de Saca
  async getCotacoesSaca(): Promise<CotacaoSaca[]> {
    const response = await api.get('/cotacoes-saca/');
    return response.data;
  },

  async createCotacaoSaca(data: Partial<CotacaoSaca>): Promise<CotacaoSaca> {
    const response = await api.post('/cotacoes-saca/', data);
    return response.data;
  },

  // Documentos de Arrendamento
  async getDocumentosArrendamento(filters?: {
    fazenda?: number;
    arrendador?: number;
    arrendatario?: number;
    status?: string;
  }): Promise<DocumentoArrendamento[]> {
    let url = '/documentos-arrendamento/';
    const params = new URLSearchParams();
    
    if (filters?.fazenda) params.append('fazenda', filters.fazenda.toString());
    if (filters?.arrendador) params.append('arrendador', filters.arrendador.toString());
    if (filters?.arrendatario) params.append('arrendatario', filters.arrendatario.toString());
    if (filters?.status) params.append('status', filters.status);
    
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },

  async getDocumentoArrendamento(id: number): Promise<DocumentoArrendamento> {
    const response = await api.get(`/documentos-arrendamento/${id}/`);
    return response.data;
  },

  async createDocumentoArrendamento(data: Partial<DocumentoArrendamento>): Promise<DocumentoArrendamento> {
    const response = await api.post('/documentos-arrendamento/', data);
    return response.data;
  },

  async updateDocumentoArrendamento(id: number, data: Partial<DocumentoArrendamento>): Promise<DocumentoArrendamento> {
    const response = await api.put(`/documentos-arrendamento/${id}/`, data);
    return response.data;
  },

  async cancelarDocumentoArrendamento(id: number): Promise<DocumentoArrendamento> {
    const response = await api.post(`/documentos-arrendamento/${id}/cancelar/`);
    return response.data;
  },

  async deleteDocumentoArrendamento(id: number): Promise<void> {
    await api.delete(`/documentos-arrendamento/${id}/`);
  },

  // Parcelas de Arrendamento
  async getParcelasArrendamento(documentoId?: number): Promise<ParcelaArrendamento[]> {
    const url = documentoId 
      ? `/parcelas-arrendamento/?documento=${documentoId}` 
      : '/parcelas-arrendamento/';
    const response = await api.get(url);
    return response.data;
  },

  async getParcelaArrendamento(id: number): Promise<ParcelaArrendamento> {
    const response = await api.get(`/parcelas-arrendamento/${id}/`);
    return response.data;
  },
};