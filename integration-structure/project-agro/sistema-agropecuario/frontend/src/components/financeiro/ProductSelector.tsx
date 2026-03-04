import React, { useState } from 'react';
import { useApiQuery } from '@/hooks/useApi';
import SelectDropdown from '@/components/common/SelectDropdown';
import ProdutosService from '@/services/produtos';
import type { Produto } from '@/types/estoque_maquinas';
import type { ItemEmprestimo } from '@/types/financeiro';

interface Props {
  onAddItem: (item: Omit<ItemEmprestimo, 'id' | 'criado_em' | 'atualizado_em'>) => void;
  maxQuantity?: number;
}

const ProductSelector: React.FC<Props> = ({ onAddItem, maxQuantity }) => {
  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null);
  const [quantidade, setQuantidade] = useState<string>('1');
  const [valorUnitario, setValorUnitario] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [erro, setErro] = useState<string>('');

  // Fetch all produtos
  const { data: produtos = [] } = useApiQuery<Produto[]>(
    ['produtos'],
    '/estoque/produtos/?page_size=1000'
  );

  const handleProdutoSearch = async (term: string): Promise<any[]> => {
    try {
      const response = await ProdutosService.listar({ search: term, page_size: 100 });
      return (response.results || []).map(p => ({
        value: p.id,
        label: `${p.nome} (${p.quantidade_estoque} ${p.unidade} disponível)`
      }));
    } catch (e) {
      console.warn('Produtos search failed:', e);
      return [];
    }
  };

  const selectedProduto = produtos.find(p => p.id === selectedProdutoId);

  const handleAddItem = () => {
    setErro('');

    // Validation
    if (!selectedProdutoId || !selectedProduto) {
      setErro('Selecione um produto');
      return;
    }

    const qtd = parseFloat(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      setErro('Quantidade deve ser maior que zero');
      return;
    }

    if (selectedProduto.quantidade_estoque && qtd > selectedProduto.quantidade_estoque) {
      setErro(`Quantidade insuficiente. Disponível: ${selectedProduto.quantidade_estoque}`);
      return;
    }

    const valorUnit = parseFloat(valorUnitario);
    if (isNaN(valorUnit) || valorUnit < 0) {
      setErro('Valor unitário inválido');
      return;
    }

    // Create item
    const newItem: Omit<ItemEmprestimo, 'id' | 'criado_em' | 'atualizado_em'> = {
      emprestimo: 0, // Will be set by parent
      produto: selectedProdutoId,
      produto_nome: selectedProduto.nome,
      produto_unidade: selectedProduto.unidade,
      quantidade: String(qtd),
      unidade: selectedProduto.unidade,
      valor_unitario: String(valorUnit),
      valor_total: String(qtd * valorUnit),
      observacoes: observacoes || undefined
    };

    onAddItem(newItem);

    // Reset form
    setSelectedProdutoId(null);
    setQuantidade('1');
    setValorUnitario('');
    setObservacoes('');
  };

  return (
    <div className="card p-3 mb-3 bg-light">
      <h5 className="mb-3">
        <i className="bi bi-plus-circle me-2"></i>Adicionar Produto
      </h5>

      {erro && <div className="alert alert-danger alert-dismissible fade show">{erro}</div>}

      <div className="mb-3">
        <label className="form-label">
          <i className="bi bi-box me-2"></i>Produto
        </label>
        <SelectDropdown
          options={produtos.map(p => ({
            value: p.id,
            label: `${p.nome} (${p.quantidade_estoque} ${p.unidade})`
          }))}
          value={selectedProdutoId ?? ''}
          onChange={(v) => {
            setSelectedProdutoId(v ? Number(v) : null);
            // Auto-fill valor_unitario from product price
            const prod = produtos.find(p => p.id === Number(v));
            if (prod) {
              // Tenta preencher com preco_unitario, custo_unitario, ou deixa vazio
              const preco = prod.preco_unitario || prod.custo_unitario || 0;
              if (preco && preco > 0) {
                setValorUnitario(String(preco));
              } else {
                setValorUnitario('');
              }
            } else {
              setValorUnitario('');
            }
          }}
          placeholder="Selecione produto..."
          searchable={true}
          onSearch={handleProdutoSearch}
        />
        {selectedProduto && (
          <small className="text-muted d-block mt-2">
            <strong>Disponível:</strong> {selectedProduto.quantidade_estoque} {selectedProduto.unidade}
          </small>
        )}
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">
            <i className="bi bi-hash me-2"></i>Quantidade
          </label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Digite a quantidade"
              min="0"
              step="0.01"
              disabled={!selectedProduto}
            />
            <span className="input-group-text">
              {selectedProduto?.unidade || '---'}
            </span>
          </div>
          {selectedProduto && (
            <small className="text-muted d-block mt-2">
              <i className="bi bi-info-circle me-1"></i>Estoque disponível: {selectedProduto.quantidade_estoque}
            </small>
          )}
        </div>

        <div className="col-md-6">
          <label className="form-label">
            <i className="bi bi-currency-dollar me-2"></i>Valor Unitário
          </label>
          <input
            type="number"
            className="form-control"
            value={valorUnitario}
            onChange={(e) => setValorUnitario(e.target.value)}
            placeholder="Auto-preenchido ou digite manualmente"
            min="0"
            step="0.01"
            disabled={!selectedProduto}
            style={{ 
              backgroundColor: !selectedProduto ? '#e9ecef' : (valorUnitario && parseFloat(valorUnitario) > 0 ? '#e8f5e9' : '#fff')
            }}
          />
          <small className="text-muted d-block mt-2">
            {valorUnitario && parseFloat(valorUnitario) > 0 
              ? '✓ Preço carregado do produto' 
              : selectedProduto 
              ? '⚠️ Digite o valor unitário' 
              : '⚠️ Selecione um produto primeiro'}
          </small>
        </div>
      </div>

      <div className="mt-3 p-3 bg-white border rounded">
        <div className="row g-2">
          <div className="col-auto">
            <strong>Valor Total:</strong>
          </div>
          <div className="col-auto">
            <h6 className="mb-0 text-success">
              R$ {
                quantidade && valorUnitario
                  ? (parseFloat(quantidade) * parseFloat(valorUnitario)).toFixed(2)
                  : '0.00'
              }
            </h6>
          </div>
        </div>
      </div>

      <div className="mb-3 mt-3">
        <label className="form-label">Observações (opcional)</label>
        <textarea
          className="form-control"
          rows={2}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex: Condições especiais de entrega"
        />
      </div>

      <div className="d-flex gap-2">
        <button
          className="btn btn-sm btn-primary"
          onClick={handleAddItem}
          disabled={!selectedProdutoId}
        >
          <i className="bi bi-check me-2"></i>Adicionar
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => {
            setSelectedProdutoId(null);
            setQuantidade('1');
            setValorUnitario('');
            setObservacoes('');
            setErro('');
          }}
        >
          <i className="bi bi-arrow-counterclockwise me-2"></i>Limpar
        </button>
      </div>
    </div>
  );
};

export default ProductSelector;
