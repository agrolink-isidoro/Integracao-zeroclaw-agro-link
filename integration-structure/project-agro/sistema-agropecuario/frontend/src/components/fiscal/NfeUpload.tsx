import React, { useState } from 'react';
import FileUpload from '../common/FileUpload';
import { uploadXml } from '../../services/fiscal';
import { useToast } from '../../hooks/useToast';

const NfeUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [badFields, setBadFields] = useState<any[]>([]);
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [clearKey, setClearKey] = useState(0);

  const onFileSelect = (files: File[]) => {
    setBadFields([]);
    setFile(files[0] ?? null);
  };

  const handleSubmit = async () => {
    if (!file) {
      showError('Selecione um arquivo XML antes de enviar');
      return;
    }

    const form = new FormData();
    form.append('xml_file', file);

    try {
      setLoading(true);
      await uploadXml(form);
      showSuccess('XML processado com sucesso');
      // limpar formulário após upload bem-sucedido
      setFile(null);
      setBadFields([]);
      setClearKey(k => k + 1);
      // poderia atualizar lista/estado conforme necessário
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && data.error === 'validation_error' && Array.isArray(data.bad_fields)) {
        setBadFields(data.bad_fields);
      } else {
        showError(data?.detail || 'Erro ao enviar XML');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Upload de NF-e (XML)</h5>
      </div>
      <div className="card-body">
        <FileUpload accept=".xml" multiple={false} onFileSelect={onFileSelect} label="Arquivo XML" resetKey={clearKey} />

        {badFields.length > 0 && (
          <div className="mt-3">
            <h6 className="text-danger">Erros de validação:</h6>
            <ul>
              {badFields.map((b, i) => (
                <li key={i}><strong>{b.field}</strong>: {b.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3 d-flex gap-2">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar XML'}
          </button>
          <button className="btn btn-outline-secondary" onClick={() => { setFile(null); setBadFields([]); setClearKey(k => k + 1); }}>
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NfeUpload;
