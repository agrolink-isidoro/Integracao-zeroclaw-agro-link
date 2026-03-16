import React from 'react';
import ModalForm from '../common/ModalForm';

interface ContratoTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompra: () => void;
  onSelectVenda: () => void;
  onSelectFinanceiro: () => void;
}

const ContratoTypeSelector: React.FC<ContratoTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelectCompra,
  onSelectVenda,
  onSelectFinanceiro,
}) => {
  return (
    <ModalForm isOpen={isOpen} title="Selecione o Tipo de Contrato" onClose={onClose} size="lg">
      <div className="row g-3">
        {/* COMPRA */}
        <div className="col-12 col-md-6 col-lg-4">
          <button
            className="btn btn-outline-info w-100 h-100 d-flex flex-column align-items-center justify-content-center p-4"
            onClick={onSelectCompra}
            style={{ minHeight: '250px' }}
          >
            <i className="bi bi-bag text-info mb-3" style={{ fontSize: '3rem' }}></i>
            <h6 className="mb-2">Contrato de Compra</h6>
            <small className="text-muted text-center mb-3">
              Compra de matérias-primas, insumos e produtos
            </small>
            <div className="text-start w-100 small">
              <ul className="list-unstyled mb-0">
                <li className="mb-1">
                  <i className="bi bi-check text-info me-2"></i>
                  Múltiplos itens
                </li>
                <li className="mb-1">
                  <i className="bi bi-check text-info me-2"></i>
                  Fornecedor e representante
                </li>
                <li>
                  <i className="bi bi-check text-info me-2"></i>
                  Condições de pagamento
                </li>
              </ul>
            </div>
          </button>
        </div>

        {/* VENDA */}
        <div className="col-12 col-md-6 col-lg-4">
          <button
            className="btn btn-outline-success w-100 h-100 d-flex flex-column align-items-center justify-content-center p-4"
            onClick={onSelectVenda}
            style={{ minHeight: '250px' }}
          >
            <i className="bi bi-graph-up text-success mb-3" style={{ fontSize: '3rem' }}></i>
            <h6 className="mb-2">Contrato de Venda</h6>
            <small className="text-muted text-center mb-3">
              Venda de produtos agrícolas e commodities
            </small>
            <div className="text-start w-100 small">
              <ul className="list-unstyled mb-0">
                <li className="mb-1">
                  <i className="bi bi-check text-success me-2"></i>
                  Qualquer cultura
                </li>
                <li className="mb-1">
                  <i className="bi bi-check text-success me-2"></i>
                  Parcelado/À vista
                </li>
                <li>
                  <i className="bi bi-check text-success me-2"></i>
                  Rastreamento
                </li>
              </ul>
            </div>
          </button>
        </div>

        {/* FINANCEIRO */}
        <div className="col-12 col-md-6 col-lg-4">
          <button
            className="btn btn-outline-warning w-100 h-100 d-flex flex-column align-items-center justify-content-center p-4"
            onClick={onSelectFinanceiro}
            style={{ minHeight: '250px' }}
          >
            <i className="bi bi-bank2 text-warning mb-3" style={{ fontSize: '3rem' }}></i>
            <h6 className="mb-2">Produtos Financeiros</h6>
            <small className="text-muted text-center mb-3">
              Seguros, aplicações e consórcios
            </small>
            <div className="text-start w-100 small">
              <ul className="list-unstyled mb-0">
                <li className="mb-1">
                  <i className="bi bi-check text-warning me-2"></i>
                  Seguros agrícolas
                </li>
                <li className="mb-1">
                  <i className="bi bi-check text-warning me-2"></i>
                  Aplicações financeiras
                </li>
                <li>
                  <i className="bi bi-check text-warning me-2"></i>
                  Consórcios
                </li>
              </ul>
            </div>
          </button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="alert alert-info mt-4 mb-0">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Dica:</strong> Cada tipo de contrato tem campos específicos para suas necessidades.
        Você pode salvar como rascunho e editar depois.
      </div>
    </ModalForm>
  );
};

export default ContratoTypeSelector;
