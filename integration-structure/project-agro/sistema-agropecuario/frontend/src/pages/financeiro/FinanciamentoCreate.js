import { jsx as _jsx } from "react/jsx-runtime";
import LoanForm from '@/components/financeiro/LoanForm';
const FinanciamentoCreate = ({ onSuccess, onCancel }) => {
    const handleSuccess = (created) => {
        if (onSuccess)
            onSuccess(created);
        else
            window.location.href = `/financeiro/financiamentos/${created.id}`;
    };
    return _jsx(LoanForm, { defaultTipo: "financiamento", onSuccess: handleSuccess, onCancel: onCancel });
};
export default FinanciamentoCreate;
