import React, { useState } from 'react';
import OperacaoForm from '@/components/financeiro/OperacaoForm';
import OperacaoDetailModal from '@/components/financeiro/OperacaoDetailModal';
import ModalForm from '@/components/common/ModalForm';
import { useApiQuery } from '@/hooks/useApi';
import type { Emprestimo, Financiamento } from '@/types/financeiro';

const OperacoesPage: React.FC = () => {
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOperacao, setSelectedOperacao] = useState<Emprestimo | Financiamento | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<'emprestimo' | 'financiamento'>('emprestimo');

  const { data: emprestimos = [] } = useApiQuery<any[]>(['emprestimos'], '/financeiro/emprestimos/');
  const { data: financiamentos = [] } = useApiQuery<any[]>(['financiamentos'], '/financeiro/financiamentos/');

  const combined = [
    ...emprestimos.map((e: any) => ({ ...e, tipo_operacao: 'Empréstimo' })),
    ...financiamentos.map((f: any) => ({ ...f, tipo_operacao: 'Financiamento' })),
  ];

  const openDetail = (operacao: any, tipo: 'emprestimo' | 'financiamento') => {
    console.log('[Operacoes] openDetail called with:', { operacao, tipo });
    setSelectedOperacao(operacao);
    setSelectedTipo(tipo);
    setDetailOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'success';
      case 'quitado':
        return 'primary';
      case 'cancelado':
        return 'danger';
      case 'em_analise':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-0">
            <i className="bi bi-wallet2 me-2"></i>
            Operações Financeiras
          </h3>
          <small className="text-muted">Empréstimos e Financiamentos</small>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNovaModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>
          Nova Operação
        </button>
      </div>

      {/* Tabela */}
      {combined.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="table-light">
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Status</th>
                <th className="text-end">Valor Pendente</th>
                <th>Data Contratação</th>
                <th>Beneficiário</th>
                <th>Primeiro Vencimento</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {combined.map((c: any, idx: number) => {
                const tipoProp = c.tipo_operacao === 'Empréstimo' ? 'emprestimo' : 'financiamento';
                const beneficiario = tipoProp === 'emprestimo' 
                  ? c.cliente_nome 
                  : c.instituicao_nome;

                return (
                  <tr key={`${c.id}-${tipoProp}`}>
                    <td className="fw-bold">
                      <i className="bi bi-file-earmark me-2"></i>
                      {c.titulo}
                    </td>
                    <td>
                      <span className={`badge bg-${tipoProp === 'emprestimo' ? 'info' : 'success'}`}>
                        {c.tipo_operacao}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="text-end fw-bold text-danger">
                      R$ {Number(c.valor_pendente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="small">{c.data_contratacao}</td>
                    <td>{beneficiario || '—'}</td>
                    <td className="small">{c.data_primeiro_vencimento}</td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        title="Visualizar detalhes"
                        onClick={() => openDetail(c, tipoProp)}
                      >
                        <i className="bi bi-eye"></i> VER
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info py-4 text-center">
          <i className="bi bi-info-circle me-2"></i>
          Nenhuma operação cadastrada. 
          <button className="btn btn-link" onClick={() => setShowNovaModal(true)}>Criar primeira operação</button>
        </div>
      )}

      {/* Modal Nova Operação */}
      <ModalForm
        isOpen={showNovaModal}
        title="Nova Operação Financeira"
        onClose={() => setShowNovaModal(false)}
        size="lg"
      >
        <OperacaoForm
          onClose={() => setShowNovaModal(false)}
          onSaved={() => setShowNovaModal(false)}
        />
      </ModalForm>

      {/* Modal de Detalhes */}
      <OperacaoDetailModal
        data={selectedOperacao}
        show={detailOpen}
        onClose={() => setDetailOpen(false)}
        tipo={selectedTipo}
      />
    </div>
  );
};

export default OperacoesPage;
