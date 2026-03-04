from rest_framework.routers import DefaultRouter
from .views import (
    VencimentoViewSet, RateioCustoViewSet, RateioApprovalViewSet,
    FinanciamentoViewSet, ParcelaFinanciamentoViewSet,
    EmprestimoViewSet, ParcelaEmprestimoViewSet, ItemEmprestimoViewSet, TransferenciaViewSet
)
from .api import BankStatementImportViewSet, BankTransactionViewSet, ItemExtratoBancarioViewSet

router = DefaultRouter()
router.register(r'vencimentos', VencimentoViewSet)
router.register(r'rateios', RateioCustoViewSet)
router.register(r'rateios-approvals', RateioApprovalViewSet)
router.register(r'financiamentos', FinanciamentoViewSet)
router.register(r'parcelas-financiamento', ParcelaFinanciamentoViewSet)
router.register(r'transferencias', TransferenciaViewSet)
router.register(r'emprestimos', EmprestimoViewSet)
router.register(r'parcelas-emprestimo', ParcelaEmprestimoViewSet)
router.register(r'itens-emprestimo', ItemEmprestimoViewSet)

# Bookkeeping / Lancamentos (Livro Caixa)
from .views import LancamentoFinanceiroViewSet
router.register(r'lancamentos', LancamentoFinanceiroViewSet, basename='lancamentos')

# Bank statements endpoints (minimal)
router.register(r'bank-statements', BankStatementImportViewSet, basename='bank-statements')
router.register(r'bank-transactions', BankTransactionViewSet, basename='bank-transactions')

# FASE 5: Conciliação bancária
router.register(r'itens-extrato', ItemExtratoBancarioViewSet, basename='itens-extrato')

# Contas bancárias (CRUD)
from .views import ContaBancariaViewSet, CreditCardViewSet
router.register(r'contas', ContaBancariaViewSet, basename='contas')
# Cartões
router.register(r'cartoes', CreditCardViewSet, basename='cartoes')

urlpatterns = router.urls