import LoanForm from '@/components/financeiro/LoanForm';

type Props = { onSuccess?: (created: any) => void; onCancel?: () => void };

const EmprestimoCreate: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const handleSuccess = (created: any) => {
    if (onSuccess) onSuccess(created);
    else window.location.href = `/financeiro/emprestimos/${created.id}`;
  };

  return <LoanForm defaultTipo="emprestimo" onSuccess={handleSuccess} onCancel={onCancel} />;
};

export default EmprestimoCreate;
