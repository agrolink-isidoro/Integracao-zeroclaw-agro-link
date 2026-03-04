import React, { useState } from 'react';
import financeiroService from '@/services/financeiro';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks/useApi';
import { toast } from 'react-hot-toast';

interface Props {
  initialData?: any;
  onClose: () => void;
  onSaved?: (data: any) => void;
}

const VencimentoForm: React.FC<Props> = ({ initialData, onClose, onSaved }) => {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;

  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [descricao, setDescricao] = useState(initialData?.descricao || '');
  const [valor, setValor] = useState(initialData?.valor || '');
  const [dataVencimento, setDataVencimento] = useState(initialData?.data_vencimento || '');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(initialData?.tipo || 'despesa');
  const [status, setStatus] = useState(initialData?.status || 'pendente');
  const [contaId, setContaId] = useState<number | null>(initialData?.conta_bancaria || null);
  const [talhaoId, setTalhaoId] = useState<number | null>(initialData?.talhao || null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch contas bancárias e talhões
  const { data: contas = [] } = useApiQuery<any[]>(['contas-bancarias'], '/financeiro/contas/');
  const { data: talhoes = [], isLoading: loadingTalhoes } = useApiQuery<any[]>(['talhoes'], '/talhoes/');

  const validate = () => {
    const e: any = {};
    if (!titulo.trim()) e.titulo = 'Título é obrigatório';
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) e.valor = 'Valor deve ser maior que zero';
    if (!dataVencimento) e.dataVencimento = 'Data de vencimento é obrigatória';
    if (!contaId) e.contaId = 'Conta bancária é obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    console.log('=== DEBUG VencimentoForm - handleSave ===');
    console.log('Estado atual:', { titulo, descricao, valor, dataVencimento, tipo, status, contaId, talhaoId });
    
    if (!validate()) {
      console.error('❌ Validação falhou:', errors);
      return;
    }
    console.log('✅ Validação passou');

    const payload: any = {
      titulo,
      descricao,
      valor: Number(valor),
      data_vencimento: dataVencimento,
      tipo,
      status,
      conta_bancaria: contaId,
    };

    // Only add talhao if it's set
    if (talhaoId !== null) {
      payload.talhao = talhaoId;
    }
    
    console.log('📦 Payload montado:', payload);
    console.log('🔄 Modo:', isEdit ? 'EDIÇÃO' : 'CRIAÇÃO');

    try {
      if (isEdit && initialData?.id) {
        console.log('🔧 Atualizando vencimento ID:', initialData.id);
        await financeiroService.updateVencimento(initialData.id, payload);
        console.log('✅ Atualização bem-sucedida');
        toast.success('Vencimento atualizado com sucesso!');
        if (onSaved) onSaved({ id: initialData.id, ...payload });
      } else {
        console.log('➕ Criando novo vencimento...');
        const created = await financeiroService.createVencimento(payload);
        console.log('✅ Criação bem-sucedida:', created);
        toast.success('Vencimento criado com sucesso!');
        if (onSaved) onSaved(created);

        // Update caches immediately: cancel in-flight vencimentos queries, then insert created item into matching caches
        try {
          const predicate = (query: any) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === 'financeiro' && key[1] === 'vencimentos';
          };

          // Cancel ongoing vencimentos queries to avoid race where an older in-flight response overwrites our inserted item
          try {
            await queryClient.cancelQueries({ predicate });
            console.log('🛑 Cancelled in-flight vencimentos queries');
          } catch (e) {
            console.warn('⚠️ Erro ao cancelar queries:', e);
          }

          const matched = queryClient.getQueryCache().findAll(predicate);
          console.log('🔍 Queries matched for cache update:', matched.map(q => q.queryKey));

          matched.forEach(q => {
            const key = q.queryKey as Array<any>;
            // Strict validation: only operate on exact financeiro/vencimentos keys
            if (!Array.isArray(key) || key[0] !== 'financeiro' || key[1] !== 'vencimentos') return;

            queryClient.setQueryData(key, (old: any) => {
              if (!old) return [created];
              if (Array.isArray(old)) {
                if (old.some((o: any) => o.id === created.id)) return old;
                console.log(`🔄 Inserting created id=${created.id} into cache key`, key, 'oldLen=', old.length);
                return [created, ...old];
              }
              return old;
            });
          });
        } catch (e) {
          console.warn('⚠️ Erro ao atualizar cache localmente:', e);
        }
      }

      console.log('🔄 Invalidando cache de queries...');
      // Invalidate all vencimentos queries regardless of pageSize
      const predicate = (query: any) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === 'financeiro' && key[1] === 'vencimentos';
      };
      queryClient.invalidateQueries({ predicate });

      // Log which queries matched and force refetch to ensure UI updates
      try {
        const matched = queryClient.getQueryCache().findAll(predicate);
        console.log('🔍 Queries matched for refetch:', matched.map(q => q.queryKey));
        await queryClient.refetchQueries({ predicate, cancelRefetch: false });
        console.log('✅ Refetch triggered for matched queries');
      } catch (e) {
        console.warn('⚠️ Erro ao forçar refetch:', e);
      }

      console.log('🚪 Fechando modal...');
      onClose();
      console.log('=== FIM DEBUG handleSave - SUCESSO ===');
    } catch (err: any) {
      console.error('❌ ERRO ao salvar vencimento:', err);
      console.error('Detalhes do erro:', {
        response: err?.response,
        data: err?.response?.data,
        status: err?.response?.status,
        headers: err?.response?.headers,
        message: err?.message,
      });
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'erro desconhecido';
      toast.error('Falha ao salvar: ' + errorMsg);
      console.log('=== FIM DEBUG handleSave - ERRO ===');
    }
  };

  return (
    <div>
      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-card-heading me-2"></i>Título
        </label>
        <input
          className={`form-control ${errors.titulo ? 'is-invalid' : ''}`}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Pagamento Fornecedor XYZ"
        />
        {errors.titulo && <div className="invalid-feedback">{errors.titulo}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">Descrição (opcional)</label>
        <textarea
          className="form-control"
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Detalhes adicionais..."
        />
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <label className="form-label">
            <i className="bi bi-cash me-2"></i>Valor
          </label>
          <input
            type="number"
            step="0.01"
            className={`form-control ${errors.valor ? 'is-invalid' : ''}`}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0.00"
          />
          {errors.valor && <div className="invalid-feedback">{errors.valor}</div>}
        </div>

        <div className="col-md-6">
          <label className="form-label">
            <i className="bi bi-calendar me-2"></i>Data de Vencimento
          </label>
          <input
            type="date"
            className={`form-control ${errors.dataVencimento ? 'is-invalid' : ''}`}
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
          />
          {errors.dataVencimento && <div className="invalid-feedback">{errors.dataVencimento}</div>}
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <label className="form-label">Tipo</label>
          <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as 'receita' | 'despesa')}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label">Status</label>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-bank me-2"></i>Conta Bancária
        </label>
        <select
          className={`form-select ${errors.contaId ? 'is-invalid' : ''}`}
          value={contaId ?? ''}
          onChange={(e) => setContaId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Selecione uma conta...</option>
          {contas.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.banco} - {c.agencia} / {c.conta}
            </option>
          ))}
        </select>
        {errors.contaId && <div className="invalid-feedback">{errors.contaId}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-geo-alt me-2"></i>Talhão (opcional)
        </label>
        <select
          key={`talhoes-${talhoes.length}`}
          className="form-select"
          value={talhaoId ?? ''}
          onChange={(e) => setTalhaoId(e.target.value ? Number(e.target.value) : null)}
          disabled={loadingTalhoes}
        >
          <option value="">
            {loadingTalhoes ? 'Carregando...' : talhoes.length === 0 ? 'Nenhum talhão cadastrado' : 'Selecione um talhão'}
          </option>
          {!loadingTalhoes && talhoes.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        {!loadingTalhoes && talhoes.length === 0 && (
          <small className="text-muted d-block mt-1">
            💡 Cadastre talhões em Fazendas para vincular vencimentos
          </small>
        )}
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          {isEdit ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </div>
  );
};

export default VencimentoForm;
