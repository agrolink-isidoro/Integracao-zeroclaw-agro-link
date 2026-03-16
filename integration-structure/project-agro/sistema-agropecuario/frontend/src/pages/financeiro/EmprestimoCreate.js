import { jsx as _jsx } from "react/jsx-runtime";
import LoanForm from '@/components/financeiro/LoanForm';
const EmprestimoCreate = ({ onSuccess, onCancel }) => {
    const handleSuccess = (created) => {
        if (onSuccess)
            onSuccess(created);
        else
            window.location.href = `/financeiro/emprestimos/${created.id}`;
    };
    return _jsx(LoanForm, { defaultTipo: "emprestimo", onSuccess: handleSuccess, onCancel: onCancel });
};
export default EmprestimoCreate;
