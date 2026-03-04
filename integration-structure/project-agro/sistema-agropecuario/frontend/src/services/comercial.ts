import api from './api';
import type {
  Fornecedor,
  PrestadorServico,
  InstituicaoFinanceira,
  ContratoComercial,
  VendaCompra,
  FiltrosComerciais,
  RelatorioComercial
} from '../types/comercial';

class ComercialService {
  // ==================== FORNECEDORES ====================

  async getFornecedores(filtros?: FiltrosComerciais): Promise<Fornecedor[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.status?.length) params.append('status', filtros.status.join(','));
        if (filtros.categoria?.length) params.append('categoria', filtros.categoria.join(','));
        if (filtros.tipo_pessoa?.length) params.append('tipo_pessoa', filtros.tipo_pessoa.join(','));
        if (filtros.estado?.length) params.append('estado', filtros.estado.join(','));
        if (filtros.busca) params.append('search', filtros.busca);
        if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      }

      const response = await api.get(`/comercial/fornecedores/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      throw error;
    }
  }

  async getFornecedorById(id: number): Promise<Fornecedor> {
    try {
      const response = await api.get(`/comercial/fornecedores/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar fornecedor:', error);
      throw error;
    }
  }

  async getFornecedoresDashboard(): Promise<Record<string, unknown>> {
    try {
      const response = await api.get(`/comercial/fornecedores/dashboard/`);
      return response.data as Record<string, unknown>;
    } catch (error) {
      console.error('Erro ao buscar dashboard de fornecedores:', error);
      // Return empty object for tests / offline dev so UI can render without throwing
      return {} as Record<string, unknown>;
    }
  }

  async createFornecedor(fornecedor: Omit<Fornecedor, 'id'>): Promise<Fornecedor> {
    try {
      const formData = new FormData();

      // Dados básicos
      formData.append('tipo_pessoa', fornecedor.tipo_pessoa);
      formData.append('cpf_cnpj', fornecedor.cpf_cnpj);
      if (fornecedor.nome_completo) formData.append('nome_completo', fornecedor.nome_completo);
      if (fornecedor.razao_social) formData.append('razao_social', fornecedor.razao_social);
      if (fornecedor.nome_fantasia) formData.append('nome_fantasia', fornecedor.nome_fantasia);
      if (fornecedor.inscricao_estadual) formData.append('inscricao_estadual', fornecedor.inscricao_estadual);
      if (fornecedor.inscricao_municipal) formData.append('inscricao_municipal', fornecedor.inscricao_municipal);

      formData.append('categoria_fornecedor', fornecedor.categoria_fornecedor);
      formData.append('status', fornecedor.status);

      if (fornecedor.prazo_pagamento_padrao) formData.append('prazo_pagamento_padrao', fornecedor.prazo_pagamento_padrao.toString());
      if (fornecedor.limite_credito) formData.append('limite_credito', fornecedor.limite_credito.toString());
      if (fornecedor.observacoes) formData.append('observacoes', fornecedor.observacoes);

      // Endereço
      const endereco = fornecedor.endereco;
      formData.append('endereco_logradouro', endereco.logradouro);
      formData.append('endereco_numero', endereco.numero);
      if (endereco.complemento) formData.append('endereco_complemento', endereco.complemento);
      formData.append('endereco_bairro', endereco.bairro);
      formData.append('endereco_cidade', endereco.cidade);
      formData.append('endereco_estado', endereco.estado);
      formData.append('endereco_cep', endereco.cep);
      if (endereco.pais) formData.append('endereco_pais', endereco.pais);

      // Contato
      const contato = fornecedor.contato;
      formData.append('contato_telefone_principal', contato.telefone_principal);
      if (contato.telefone_secundario) formData.append('contato_telefone_secundario', contato.telefone_secundario);
      formData.append('contato_email_principal', contato.email_principal);
      if (contato.email_secundario) formData.append('contato_email_secundario', contato.email_secundario);
      if (contato.site) formData.append('contato_site', contato.site);
      if (contato.observacoes) formData.append('contato_observacoes', contato.observacoes);

      // Documentos
      fornecedor.documentos.forEach((doc, index) => {
        formData.append(`documentos[${index}]tipo`, doc.tipo);
        formData.append(`documentos[${index}]numero`, doc.numero);
        if (doc.data_emissao) formData.append(`documentos[${index}]data_emissao`, doc.data_emissao);
        if (doc.data_validade) formData.append(`documentos[${index}]data_validade`, doc.data_validade);
        if (doc.orgao_emissor) formData.append(`documentos[${index}]orgao_emissor`, doc.orgao_emissor);
        if (doc.arquivo) formData.append(`documentos[${index}]arquivo`, doc.arquivo);
        if (doc.observacoes) formData.append(`documentos[${index}]observacoes`, doc.observacoes);
      });

      // Dados bancários (nested) -> map to flat fields expected by backend
      const dadosB = (fornecedor as any).dados_bancarios || {};
      if (dadosB) {
        if (dadosB.banco) formData.append('banco', dadosB.banco);
        if (dadosB.agencia) formData.append('agencia_bancaria', dadosB.agencia);
        if (dadosB.conta) formData.append('conta_bancaria', dadosB.conta);
        if (dadosB.tipo_conta) formData.append('tipo_conta', dadosB.tipo_conta);
        if (dadosB.titular) formData.append('titular_conta', dadosB.titular);
        if (dadosB.chave_pix) formData.append('chave_pix', dadosB.chave_pix);
        if (dadosB.tipo_chave_pix) formData.append('tipo_chave_pix', dadosB.tipo_chave_pix);
      }

      console.debug('[ComercialService] createFornecedor prepared formData entries (first 50):', Array.from((formData as any).entries()).slice(0, 50));
      const response = await api.post('/comercial/fornecedores/', formData);
      console.debug('[ComercialService] createFornecedor received response status=', response.status);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      throw error;
    }
  }

  async updateFornecedor(id: number, fornecedor: Partial<Fornecedor>): Promise<Fornecedor> {
    try {
      const formData = new FormData();

      // Dados básicos
      if (fornecedor.tipo_pessoa) formData.append('tipo_pessoa', fornecedor.tipo_pessoa);
      if (fornecedor.cpf_cnpj) formData.append('cpf_cnpj', fornecedor.cpf_cnpj);
      if (fornecedor.nome_completo) formData.append('nome_completo', fornecedor.nome_completo);
      if (fornecedor.razao_social) formData.append('razao_social', fornecedor.razao_social);
      if (fornecedor.nome_fantasia) formData.append('nome_fantasia', fornecedor.nome_fantasia);
      if (fornecedor.inscricao_estadual) formData.append('inscricao_estadual', fornecedor.inscricao_estadual);
      if (fornecedor.inscricao_municipal) formData.append('inscricao_municipal', fornecedor.inscricao_municipal);

      if (fornecedor.categoria_fornecedor) formData.append('categoria_fornecedor', fornecedor.categoria_fornecedor);
      if (fornecedor.status) formData.append('status', fornecedor.status);

      if (fornecedor.prazo_pagamento_padrao) formData.append('prazo_pagamento_padrao', fornecedor.prazo_pagamento_padrao.toString());
      if (fornecedor.limite_credito) formData.append('limite_credito', fornecedor.limite_credito.toString());
      if (fornecedor.observacoes) formData.append('observacoes', fornecedor.observacoes);

      // Endereço
      if (fornecedor.endereco) {
        const endereco = fornecedor.endereco;
        formData.append('endereco_logradouro', endereco.logradouro);
        formData.append('endereco_numero', endereco.numero);
        if (endereco.complemento) formData.append('endereco_complemento', endereco.complemento);
        formData.append('endereco_bairro', endereco.bairro);
        formData.append('endereco_cidade', endereco.cidade);
        formData.append('endereco_estado', endereco.estado);
        formData.append('endereco_cep', endereco.cep);
        if (endereco.pais) formData.append('endereco_pais', endereco.pais);
      }

      // Contato
      if (fornecedor.contato) {
        const contato = fornecedor.contato;
        formData.append('contato_telefone_principal', contato.telefone_principal);
        if (contato.telefone_secundario) formData.append('contato_telefone_secundario', contato.telefone_secundario);
        formData.append('contato_email_principal', contato.email_principal);
        if (contato.email_secundario) formData.append('contato_email_secundario', contato.email_secundario);
        if (contato.site) formData.append('contato_site', contato.site);
        if (contato.observacoes) formData.append('contato_observacoes', contato.observacoes);
      }

      // Documentos
      if (fornecedor.documentos) {
        fornecedor.documentos.forEach((doc, index) => {
          formData.append(`documentos[${index}]tipo`, doc.tipo);
          formData.append(`documentos[${index}]numero`, doc.numero);
          if (doc.data_emissao) formData.append(`documentos[${index}]data_emissao`, doc.data_emissao);
          if (doc.data_validade) formData.append(`documentos[${index}]data_validade`, doc.data_validade);
          if (doc.orgao_emissor) formData.append(`documentos[${index}]orgao_emissor`, doc.orgao_emissor);
          if (doc.arquivo) formData.append(`documentos[${index}]arquivo`, doc.arquivo);
          if (doc.observacoes) formData.append(`documentos[${index}]observacoes`, doc.observacoes);
        });
      }

      // Dados bancários (nested) -> map to flat fields expected by backend
      if ((fornecedor as any).dados_bancarios) {
        const dadosB = (fornecedor as any).dados_bancarios;
        if (dadosB.banco) formData.append('banco', dadosB.banco);
        if (dadosB.agencia) formData.append('agencia_bancaria', dadosB.agencia);
        if (dadosB.conta) formData.append('conta_bancaria', dadosB.conta);
        if (dadosB.tipo_conta) formData.append('tipo_conta', dadosB.tipo_conta);
        if (dadosB.titular) formData.append('titular_conta', dadosB.titular);
        if (dadosB.chave_pix) formData.append('chave_pix', dadosB.chave_pix);
        if (dadosB.tipo_chave_pix) formData.append('tipo_chave_pix', dadosB.tipo_chave_pix);
      }

      const response = await api.patch(`/comercial/fornecedores/${id}/`, formData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      throw error;
    }
  }

  async deleteFornecedor(id: number): Promise<void> {
    try {
      await api.delete(`/comercial/fornecedores/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar fornecedor:', error);
      throw error;
    }
  }

  async getDocumentos(fornecedor?: number): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (fornecedor) params.append('fornecedor', String(fornecedor));
      const response = await api.get(`/comercial/documentos-fornecedor/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar documentos de fornecedor:', error);
      return [] as any[];
    }
  }

  async createDocumento(data: FormData): Promise<any> {
    try {
      const response = await api.post('/comercial/documentos-fornecedor/', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar documento:', error);
      throw error;
    }
  }

  async deleteDocumento(id: number): Promise<void> {
    try {
      await api.delete(`/comercial/documentos-fornecedor/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar documento:', error);
      throw error;
    }
  }

  // ==================== PRESTADORES ====================

  async getPrestadores(filtros?: FiltrosComerciais): Promise<PrestadorServico[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.status?.length) params.append('status', filtros.status.join(','));
        if (filtros.categoria?.length) params.append('categoria', filtros.categoria.join(','));
        if (filtros.tipo_pessoa?.length) params.append('tipo_pessoa', filtros.tipo_pessoa.join(','));
        if (filtros.estado?.length) params.append('estado', filtros.estado.join(','));
        if (filtros.busca) params.append('search', filtros.busca);
      }

      // backend registers prestadores as 'prestadores-servico'
      const response = await api.get(`/comercial/prestadores-servico/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar prestadores:', error);
      throw error;
    }
  }

  async getPrestadorById(id: number): Promise<PrestadorServico> {
    try {
      const response = await api.get(`/comercial/prestadores-servico/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar prestador:', error);
      throw error;
    }
  }

  async createPrestador(prestador: Omit<PrestadorServico, 'id'>): Promise<PrestadorServico> {
    try {
      const response = await api.post('/comercial/prestadores-servico/', prestador);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar prestador:', error);
      throw error;
    }
  }

  // ==================== CARGAS / SILOS / CLIENTES (autocomplete helpers) ====================

  async getCargas(search?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/comercial/cargas-viagem/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar cargas:', error);
      return [];
    }
  }

  async getSilos(search?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/comercial/silos-bolsa/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar silos:', error);
      return [];
    }
  }

  // Compatibility wrapper: search helper calls the filters-based getClientes
  async getClientes(search?: string): Promise<any[]> {
    try {
      return await this.getClientesWithFilters({ busca: search });
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return [];
    }
  }

  // Internal implementation using filters
  async getClientesWithFilters(filtros?: FiltrosComerciais): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filtros) {
        if (filtros.busca) params.append('search', filtros.busca);
      }
      const response = await api.get(`/comercial/clientes/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return [];
    }
  }

  async getLocais(search?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/estoque/locais-armazenamento/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar locais de armazenamento:', error);
      return [];
    }
  }

  async getProdutosByLocal(localId: number): Promise<any[]> {
    try {
      const response = await api.get(`/estoque/produtos/?local_armazenamento=${localId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar produtos por local:', error);
      return [];
    }
  }

  async updatePrestador(id: number, prestador: Partial<PrestadorServico>): Promise<PrestadorServico> {
    try {
      const response = await api.patch(`/comercial/prestadores-servico/${id}/`, prestador);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar prestador:', error);
      throw error;
    }
  }

  async deletePrestador(id: number): Promise<void> {
    try {
      await api.delete(`/comercial/prestadores-servico/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar prestador:', error);
      throw error;
    }
  }

  // ==================== INSTITUIÇÕES ====================

  async getInstituicoes(filtros?: FiltrosComerciais): Promise<InstituicaoFinanceira[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.status?.length) params.append('status', filtros.status.join(','));
        if (filtros.busca) params.append('search', filtros.busca);
      }

      // Request larger page by default to avoid truncated lists in callers (e.g., dropdowns)
      if (!params.has('page_size')) params.append('page_size', '1000');

      const response = await api.get(`/comercial/instituicoes-financeiras/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar instituições:', error);
      throw error;
    }
  }



  async createCliente(cliente: any): Promise<any> {
    try {
      const response = await api.post('/comercial/clientes/', cliente);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  }
  async getClienteById(id: number): Promise<any> {
    try {
      const response = await api.get(`/comercial/clientes/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      throw error;
    }
  }
  async getInstituicaoById(id: number): Promise<InstituicaoFinanceira> {
    try {
      const response = await api.get(`/comercial/instituicoes-financeiras/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar instituição:', error);
      throw error;
    }
  }

  async createInstituicao(instituicao: Omit<InstituicaoFinanceira, 'id'>): Promise<InstituicaoFinanceira> {
    try {
      const response = await api.post('/comercial/instituicoes-financeiras/', instituicao);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar instituição:', error);
      throw error;
    }
  }

  async updateInstituicao(id: number, instituicao: Partial<InstituicaoFinanceira>): Promise<InstituicaoFinanceira> {
    try {
      const response = await api.patch(`/comercial/instituicoes-financeiras/${id}/`, instituicao);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar instituição:', error);
      throw error;
    }
  }

  async deleteInstituicao(id: number): Promise<void> {
    try {
      await api.delete(`/comercial/instituicoes-financeiras/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar instituição:', error);
      throw error;
    }
  }

  // ==================== CONTRATOS ====================

  async getContratos(filtros?: FiltrosComerciais): Promise<ContratoComercial[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.status?.length) params.append('status', filtros.status.join(','));
        if (filtros.categoria?.length) params.append('categoria', filtros.categoria.join(','));
        if (filtros.busca) params.append('search', filtros.busca);
        if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      }

      const response = await api.get(`/comercial/contratos/?${params}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar contratos:', error);
      throw error;
    }
  }

  async getContratoById(id: number): Promise<ContratoComercial> {
    try {
      const response = await api.get(`/comercial/contratos/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar contrato:', error);
      throw error;
    }
  }

  async createContrato(contrato: Omit<ContratoComercial, 'id'>): Promise<ContratoComercial> {
    try {
      const formData = new FormData();

      // Dados básicos
      formData.append('numero_contrato', contrato.numero_contrato);
      formData.append('titulo', contrato.titulo);
      formData.append('tipo_contrato', contrato.tipo_contrato);
      formData.append('categoria', contrato.categoria);
      formData.append('status', contrato.status);
      formData.append('valor_total', contrato.valor_total.toString());
      formData.append('data_inicio', contrato.data_inicio);
      if (contrato.data_fim) formData.append('data_fim', contrato.data_fim);
      if (contrato.prazo_execucao_dias) formData.append('prazo_execucao_dias', contrato.prazo_execucao_dias.toString());
      if (contrato.observacoes) formData.append('observacoes', contrato.observacoes);

      // ✅ JSONFields - enviar como JSON estruturado (não flattenizado)
      if (contrato.partes && contrato.partes.length > 0) {
        formData.append('partes', JSON.stringify(contrato.partes));
      }

      if (contrato.itens && contrato.itens.length > 0) {
        formData.append('itens', JSON.stringify(contrato.itens));
      }

      if (contrato.condicoes && contrato.condicoes.length > 0) {
        formData.append('condicoes', JSON.stringify(contrato.condicoes));
      }

      // ✅ Documento - usar nome correto ('documento')
      if (contrato.documento) {
        formData.append('documento', contrato.documento);
      }

      const response = await api.post('/comercial/contratos/', formData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      throw error;
    }
  }

  async updateContrato(id: number, contrato: Partial<ContratoComercial>): Promise<ContratoComercial> {
    try {
      const response = await api.patch(`/comercial/contratos/${id}/`, contrato);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar contrato:', error);
      throw error;
    }
  }

  async deleteContrato(id: number): Promise<void> {
    try {
      await api.delete(`/comercial/contratos/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar contrato:', error);
      throw error;
    }
  }

  // ==================== VENDAS/COMPRAS ====================

  async getVendasCompras(filtros?: FiltrosComerciais): Promise<VendaCompra[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.busca) params.append('search', filtros.busca);
        if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      }

      const response = await api.get(`/comercial/vendas-compras/?${params}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar vendas/compras:', error);
      throw error;
    }
  }

  // ==================== EMPRESAS ====================

  async getEmpresas(filtros?: { busca?: string, status?: string, cnpj?: string }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filtros) {
        if (filtros.busca) params.append('search', filtros.busca);
        if (filtros.status) params.append('status', filtros.status);
        if (filtros.cnpj) params.append('cnpj', filtros.cnpj);
      }
      const response = await api.get(`/comercial/empresas/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      throw error;
    }
  }

  async getEmpresaById(id: number): Promise<any> {
    try {
      const response = await api.get(`/comercial/empresas/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      throw error;
    }
  }

  async createEmpresa(payload: { nome: string; cnpj: string; contato?: string; endereco?: string; }): Promise<any> {
    try {
      const response = await api.post('/comercial/empresas/', payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      throw error;
    }
  }

  async createDespesaPrestadora(d: { empresa: number; prestador?: number; data: string; categoria: string; valor: number | string; centro_custo?: number; descricao?: string; }): Promise<any> {
    try {
      const response = await api.post('/comercial/despesas-prestadoras/', d);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar despesa prestadora:', error);
      throw error;
    }
  }

  async getEmpresaDespesas(id: number, params = {}): Promise<any> {
    try {
      const response = await api.get(`/comercial/empresas/${id}/despesas/`, { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar despesas da empresa:', error);
      throw error;
    }
  }

  async getEmpresaAgregados(id: number, periodo: string): Promise<any> {
    try {
      const response = await api.get(`/comercial/empresas/${id}/agregados/`, { params: { periodo } });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar agregados da empresa:', error);
      throw error;
    }
  }

  async createVendaCompra(vendaCompra: Omit<VendaCompra, 'id'>): Promise<VendaCompra> {
    try {
      const response = await api.post('/comercial/vendas-compras/', vendaCompra);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar venda/compra:', error);
      throw error;
    }
  }

  // ==================== COMPRAS ====================

  async getCompras(filtros?: FiltrosComerciais): Promise<VendaCompra[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
        if (filtros.busca) params.append('search', filtros.busca);
        if (filtros.valor_minimo) params.append('valor_minimo', filtros.valor_minimo.toString());
        if (filtros.valor_maximo) params.append('valor_maximo', filtros.valor_maximo.toString());
      }

      const response = await api.get(`/comercial/compras/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar compras:', error);
      throw error;
    }
  }

  async createCompra(compra: { fornecedor: number; data: string; valor_total: number | string; descricao?: string; }): Promise<VendaCompra> {
    try {
      const payload = {
        fornecedor: compra.fornecedor,
        data: compra.data,
        valor_total: compra.valor_total,
        descricao: compra.descricao || ''
      };
      const response = await api.post('/comercial/compras/', payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar compra:', error);
      throw error;
    }
  }

  // ==================== RELATÓRIOS ====================

  async getRelatorioComercial(dataInicio: string, dataFim: string): Promise<RelatorioComercial> {
    try {
      const response = await api.get('/comercial/relatorios/', {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar relatório comercial:', error);
      throw error;
    }
  }
}

export default new ComercialService();