import api from './api';

// Tipos
export type CertificadoSefaz = {
  id: number;
  nome: string;
  tipo?: 'p12' | 'a3';
  uploaded_by?: number;
  created_at: string;
  validade: string | null;
  fingerprint: string | null;
  arquivo_name?: string;
  a3_cnpj?: string | null;
  a3_cpf?: string | null;
  has_password?: boolean;
  tipo_certificado?: string;   // 'e-CNPJ' | 'e-CPF' | ...
  cnpj_titular?: string | null;
  cpf_titular?: string | null;
  nome_titular?: string | null;
  apto_manifestacao?: boolean;  // true if e-CNPJ
};

export type ManifestacaoPayload = {
  tipo: string;
  motivo?: string;
  certificado_id?: number;
};

export async function uploadXml(formData: FormData) {
  // Do not set Content-Type explicitly; letting the browser/XHR set it ensures the
  // proper boundary is included and the server can parse multipart payloads.
  return api.post('/fiscal/nfes/upload_xml/', formData);
}

export async function downloadXml(id: number) {
  return api.get(`/fiscal/nfes/${id}/download_xml/`);
}

export async function sendToSefaz(id: number) {
  return api.post(`/fiscal/nfes/${id}/send_to_sefaz/`);
}

export async function listNfes(params?: object) {
  return api.get('/fiscal/nfes/', { params });
}

export async function getNfe(id: number) {
  return api.get(`/fiscal/nfes/${id}/`);
}

export async function confirmarEstoque(id: number, body?: object) {
  return api.post(`/fiscal/nfes/${id}/confirmar_estoque/`, body || {});
}

export async function uploadCert(formData: FormData) {
  // Let the browser set Content-Type with boundary automatically
  return api.post('/fiscal/certificados/', formData);
}

export async function listCertificados() {
  return api.get('/fiscal/certificados/');
}

export async function deleteCertificado(certificadoId: number) {
  return api.delete(`/fiscal/certificados/${certificadoId}/`);
}

export async function setCertificadoPassword(certificadoId: number, password: string) {
  return api.post(`/fiscal/certificados/${certificadoId}/set_password/`, { password });
}

// Manifestação APIs
export async function postManifestacao(nfeId: number, payload: ManifestacaoPayload) {
  return api.post(`/fiscal/nfes/${nfeId}/manifestacao/`, payload);
}

export async function listManifestacoes(params?: object) {
  return api.get('/fiscal/manifestacoes/', { params });
}

export async function listManifestacoesForNfe(nfeId: number) {
  return api.get(`/fiscal/nfes/${nfeId}/manifestacoes/`);
}

export type SincronizacaoJob = {
  job_id: number;
  status: string;
  created_at?: string;
  updated_at?: string;
  details?: {
    created?: number;
    certificados?: any[];
    errors?: any[];
  };
};

export async function sincronizarNFesSefaz() {
  return api.post<SincronizacaoJob>('/fiscal/nfes/sincronizar/');
}

export async function verificarStatusSincronizacao(jobId: number) {
  return api.get<SincronizacaoJob>(`/fiscal/nfes/sincronizar/status/${jobId}/`);
}

// Remote NFe APIs (distribution sync)
export async function listNfesRemoto(params?: object) {
  return api.get('/fiscal/nfes/', { params: { ...params, remote: true } });
}

export async function importNFeRemote(remoteId: number, payload: object) {
  return api.post(`/fiscal/nfes/remotas/${remoteId}/import/`, payload);
}

// Item NFe overrides
export type ItemOverridePayload = {
  item: number;
  quantidade?: string | number;
  valor_unitario?: string | number;
  valor_produto?: string | number;
  aplicado?: boolean;
  motivo?: string;
};

export async function createItemOverride(payload: ItemOverridePayload) {
  return api.post('/fiscal/item-overrides/', payload);
}

export async function getNfeDivergencias(nfeId: number) {
  return api.get(`/fiscal/nfes/${nfeId}/divergencias/`);
}

export async function applyItemOverride(overrideId: number) {
  return api.post(`/fiscal/item-overrides/${overrideId}/apply/`);
}

export async function saveAndReflect(nfeId: number, items: Array<{ item_id: number; quantidade?: string | number; valor_unitario?: string | number }>) {
  return api.post(`/fiscal/nfes/${nfeId}/save_and_reflect/`, { items });
}

export async function updateNfe(nfeId: number, body: object) {
  return api.patch(`/fiscal/nfes/${nfeId}/`, body);
}

// Reflect fornecedor from NFe (create/update)
export async function reflectFornecedor(nfeId: number, force: boolean = false, overrides?: { nome?: string; cpf_cnpj?: string }) {
  const body: any = { force };
  if (overrides?.nome !== undefined) body.nome = overrides.nome;
  if (overrides?.cpf_cnpj !== undefined) body.cpf_cnpj = overrides.cpf_cnpj;
  return api.post(`/fiscal/nfes/${nfeId}/reflect_fornecedor/`, body);
}

// Reflect cliente from NFe destinatário (create/update)
export async function reflectCliente(nfeId: number, force: boolean = false) {
  return api.post(`/fiscal/nfes/${nfeId}/reflect_cliente/`, { force });
}

// Preview XML before importing (returns parsed NFe data without persisting)
export type NfePreview = {
  chave_acesso: string;
  numero: string;
  serie: string;
  data_emissao: string;
  natureza_operacao: string;
  emitente: {
    cnpj: string;
    nome: string;
    fantasia: string;
    inscricao_estadual: string;
  };
  destinatario: {
    cnpj: string;
    cpf: string;
    nome: string;
    inscricao_estadual: string;
    email: string;
  };
  totais: {
    valor_produtos: string;
    valor_nota: string;
    valor_icms: string;
    valor_pis: string;
    valor_cofins: string;
    valor_ipi: string;
    valor_frete: string;
    valor_desconto: string;
  };
  itens: Array<{
    numero_item: string;
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: string;
    valor_unitario: string;
    valor_total: string;
  }>;
  duplicatas: Array<{
    numero: string;
    data_vencimento: string;
    valor: string;
  }>;
  pagamentos: Array<{
    tPag: string;
    vPag: string;
    label: string;
    tBand?: string;
    cAut?: string;
  }>;
  already_imported: boolean;
  error?: string;
};

export async function previewXml(formData: FormData) {
  return api.post<NfePreview>('/fiscal/nfes/preview_xml/', formData);
}

// Centro de Custo (for import modal)
export async function listCentroCusto(params?: object) {
  return api.get('/administrativo/centro-custo/', { params });
}

// Sincronização NSU (consulta DistDFeInt)
export async function syncNFesFromSefaz(certificadoId: number) {
  return api.post(`/fiscal/certificados/${certificadoId}/sync_nfes/`);
}
