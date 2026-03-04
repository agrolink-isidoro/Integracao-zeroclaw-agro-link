import React from 'react';

const RateioPreviewModal: React.FC<{ show: boolean; onClose: () => void; preview?: any; onCreate?: () => void }> = ({ show, onClose, preview, onCreate }) => {
  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Preview de Rateio</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {!preview && <div>Sem dados</div>}
            {preview && (
              <div>
                <p><strong>Valor total:</strong> R$ {preview.valor_total || '-'}</p>
                <table className="table">
                  <thead>
                    <tr><th>Talhão</th><th>Área</th><th>Proporção</th><th>Valor rateado</th></tr>
                  </thead>
                  <tbody>
                    {(preview.parts || []).map((p: any, idx: number) => (
                      <tr key={idx}>
                        <td>{p.talhao_nome || p.talhao}</td>
                        <td>{p.area}</td>
                        <td>{p.proporcao}</td>
                        <td>R$ {p.valor_rateado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
            <button className="btn btn-primary" onClick={onCreate}>Criar Rateio</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RateioPreviewModal;
