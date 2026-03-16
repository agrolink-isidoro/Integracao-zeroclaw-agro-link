import api from './api';
export async function uploadXml(formData) {
    // Do not set Content-Type explicitly; letting the browser/XHR set it ensures the
    // proper boundary is included and the server can parse multipart payloads.
    return api.post('/fiscal/nfes/upload_xml/', formData);
}
export async function downloadXml(id) {
    return api.get(`/fiscal/nfes/${id}/download_xml/`);
}
export async function sendToSefaz(id) {
    return api.post(`/fiscal/nfes/${id}/send_to_sefaz/`);
}
export async function listNfes(params) {
    return api.get('/fiscal/nfes/', { params });
}
export async function getNfe(id) {
    return api.get(`/fiscal/nfes/${id}/`);
}
export async function confirmarEstoque(id, body) {
    return api.post(`/fiscal/nfes/${id}/confirmar_estoque/`, body || {});
}
export async function uploadCert(formData) {
    // Let the browser set Content-Type with boundary automatically
    return api.post('/fiscal/certificados/', formData);
}
export async function listCertificados() {
    return api.get('/fiscal/certificados/');
}
export async function deleteCertificado(certificadoId) {
    return api.delete(`/fiscal/certificados/${certificadoId}/`);
}
export async function setCertificadoPassword(certificadoId, password) {
    return api.post(`/fiscal/certificados/${certificadoId}/set_password/`, { password });
}
// Manifestação APIs
export async function postManifestacao(nfeId, payload) {
    return api.post(`/fiscal/nfes/${nfeId}/manifestacao/`, payload);
}
export async function listManifestacoes(params) {
    return api.get('/fiscal/manifestacoes/', { params });
}
export async function listManifestacoesForNfe(nfeId) {
    return api.get(`/fiscal/nfes/${nfeId}/manifestacoes/`);
}
export async function sincronizarNFesSefaz() {
    return api.post('/fiscal/nfes/sincronizar/');
}
export async function verificarStatusSincronizacao(jobId) {
    return api.get(`/fiscal/nfes/sincronizar/status/${jobId}/`);
}
// Remote NFe APIs (distribution sync)
export async function listNfesRemoto(params) {
    return api.get('/fiscal/nfes/', { params: { ...params, remote: true } });
}
export async function importNFeRemote(remoteId, payload) {
    return api.post(`/fiscal/nfes/remotas/${remoteId}/import/`, payload);
}
export async function createItemOverride(payload) {
    return api.post('/fiscal/item-overrides/', payload);
}
export async function getNfeDivergencias(nfeId) {
    return api.get(`/fiscal/nfes/${nfeId}/divergencias/`);
}
export async function applyItemOverride(overrideId) {
    return api.post(`/fiscal/item-overrides/${overrideId}/apply/`);
}
export async function saveAndReflect(nfeId, items) {
    return api.post(`/fiscal/nfes/${nfeId}/save_and_reflect/`, { items });
}
export async function updateNfe(nfeId, body) {
    return api.patch(`/fiscal/nfes/${nfeId}/`, body);
}
// Reflect fornecedor from NFe (create/update)
export async function reflectFornecedor(nfeId, force = false, overrides) {
    const body = { force };
    if (overrides?.nome !== undefined)
        body.nome = overrides.nome;
    if (overrides?.cpf_cnpj !== undefined)
        body.cpf_cnpj = overrides.cpf_cnpj;
    return api.post(`/fiscal/nfes/${nfeId}/reflect_fornecedor/`, body);
}
// Reflect cliente from NFe destinatário (create/update)
export async function reflectCliente(nfeId, force = false) {
    return api.post(`/fiscal/nfes/${nfeId}/reflect_cliente/`, { force });
}
export async function previewXml(formData) {
    return api.post('/fiscal/nfes/preview_xml/', formData);
}
// Centro de Custo (for import modal)
export async function listCentroCusto(params) {
    return api.get('/administrativo/centro-custo/', { params });
}
// Sincronização NSU (consulta DistDFeInt)
export async function syncNFesFromSefaz(certificadoId) {
    return api.post(`/fiscal/certificados/${certificadoId}/sync_nfes/`);
}
