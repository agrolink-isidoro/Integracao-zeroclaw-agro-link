import React from 'react';
import type { ItemEmprestimo } from '@/types/financeiro';

interface Props {
  items: Omit<ItemEmprestimo, 'emprestimo'>[];
  onRemoveItem: (itemIndex: number) => void;
  onEditItem?: (itemIndex: number, updates: Partial<ItemEmprestimo>) => void;
}

const ItemEmprestimoList: React.FC<Props> = ({ items, onRemoveItem, onEditItem }) => {
  const totalValue = items.reduce((sum, item) => {
    const valor = parseFloat(String(item.valor_total || 0));
    return sum + (isNaN(valor) ? 0 : valor);
  }, 0);

  if (items.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Nenhum produto adicionado ao empréstimo.
      </div>
    );
  }

  return (
    <div className="card mb-3">
      <div className="card-header bg-light">
        <h6 className="mb-0">
          <i className="bi bi-list-check me-2"></i>
          Produtos do Empréstimo ({items.length})
        </h6>
      </div>

      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Valor Unitário</th>
                <th>Valor Total</th>
                <th style={{ width: '100px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div>
                      <strong>{item.produto_nome}</strong>
                      {item.observacoes && (
                        <div className="small text-muted">{item.observacoes}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    {item.quantidade} {item.produto_unidade}
                  </td>
                  <td className="text-end">
                    R$ {parseFloat(String(item.valor_unitario || 0)).toFixed(2)}
                  </td>
                  <td className="text-end">
                    <strong>R$ {parseFloat(String(item.valor_total || 0)).toFixed(2)}</strong>
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => onRemoveItem(index)}
                      title="Remover produto"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-light">
              <tr>
                <td colSpan={3} className="text-end">
                  <strong>Total:</strong>
                </td>
                <td className="text-end">
                  <h6 className="mb-0">R$ {totalValue.toFixed(2)}</h6>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemEmprestimoList;
