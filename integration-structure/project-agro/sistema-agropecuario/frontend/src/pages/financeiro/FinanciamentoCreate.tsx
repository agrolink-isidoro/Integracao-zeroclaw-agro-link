import LoanForm from '@/components/financeiro/LoanForm';

type Props = { onSuccess?: (created: any) => void; onCancel?: () => void };

const FinanciamentoCreate: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const handleSuccess = (created: any) => {
    if (onSuccess) onSuccess(created);
    else window.location.href = `/financeiro/financiamentos/${created.id}`;
  };

  return <LoanForm defaultTipo="financiamento" onSuccess={handleSuccess} onCancel={onCancel} />;
};

export default FinanciamentoCreate;
