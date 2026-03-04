import React, { useState } from 'react';
import FileUpload from '../common/FileUpload';
import { uploadCert, listCertificados } from '../../services/fiscal';
import { useToast } from '../../hooks/useToast';

const CertificadoUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);

  const onFileSelect = (files: File[]) => {
    setFile(files[0] ?? null);
  };

  const handleSubmit = async () => {
    if (!file) {
      showError('Selecione um certificado (.p12/.pfx) antes de enviar');
      return;
    }

    const form = new FormData();
    form.append('nome', file.name);
    form.append('arquivo', file);

    try {
      setLoading(true);
      await uploadCert(form);
      showSuccess('Certificado enviado com sucesso');
      // opcional: refresh da lista
      await listCertificados();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && data.error) {
        if (data.error === 'invalid_file_type') {
          showError('Tipo de arquivo inválido. Envie .p12 ou .pfx');
        } else if (data.error === 'file_too_large') {
          showError('Arquivo muito grande. Verifique o limite');
        } else {
          showError('Erro ao enviar certificado');
        }
      } else {
        showError('Erro ao enviar certificado');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mt-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Upload de Certificado SEFAZ</h5>
      </div>
      <div className="card-body">
        <FileUpload accept=".p12,.pfx" multiple={false} onFileSelect={onFileSelect} label="Certificado (.p12/.pfx)" />

        <div className="mt-3 d-flex gap-2">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Certificado'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificadoUpload;
