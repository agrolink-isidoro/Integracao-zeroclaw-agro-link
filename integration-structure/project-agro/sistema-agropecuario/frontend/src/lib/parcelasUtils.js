// ========================================
// UTILIDADES PARA GERAÇÃO DE PARCELAS
// ========================================
/**
 * Calcula quantos dias adicionar baseado na periodicidade
 */
function diasPorPeriodicidade(periodicidade) {
    switch (periodicidade) {
        case 'SEMANAL':
            return 7;
        case 'QUINZENAL':
            return 14;
        case 'MENSAL':
            return 30;
        case 'BIMESTRAL':
            return 60;
        default:
            return 30;
    }
}
/**
 * Calcula a data de vencimento adicionando dias
 */
export function calcularDataVencimento(dataInicio, diasAdicionar) {
    const data = new Date(dataInicio);
    data.setDate(data.getDate() + diasAdicionar);
    return data.toISOString().split('T')[0];
}
/**
 * Gera array de parcelas com datas e valores distribuído igualmente
 */
export function gerarParcelas(params) {
    const { valor_total, numero_parcelas, periodicidade, data_inicio } = params;
    if (numero_parcelas <= 0) {
        throw new Error('Número de parcelas deve ser maior que 0');
    }
    if (valor_total <= 0) {
        throw new Error('Valor total deve ser maior que 0');
    }
    const diasIntervalo = diasPorPeriodicidade(periodicidade);
    const valorParcela = Number((valor_total / numero_parcelas).toFixed(2));
    const parcelas = [];
    for (let i = 1; i <= numero_parcelas; i++) {
        const diasAdicionar = diasIntervalo * i;
        const dataVencimento = calcularDataVencimento(data_inicio, diasAdicionar);
        // Última parcela recebe o saldo restante para evitar arredondamentos
        const valor = i === numero_parcelas ? Number((valor_total - valorParcela * (i - 1)).toFixed(2)) : valorParcela;
        parcelas.push({
            numero_parcela: i,
            data_vencimento: dataVencimento,
            valor,
            status: 'pendente',
        });
    }
    return parcelas;
}
/**
 * Calcula prazo de execução em dias entre duas datas
 */
export function calcularPrazoExecucao(dataInicio, dataFim) {
    if (!dataInicio || !dataFim)
        return 0;
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diferenca = fim.getTime() - inicio.getTime();
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
}
/**
 * Formata lista de parcelas para exibição
 */
export function formatarParcelasPadraoExibicao(parcelas) {
    return parcelas.map((p) => ({
        ...p,
        valor: Number(p.valor.toFixed(2)),
    }));
}
/**
 * Calcula somatório de parcelas pagas
 */
export function calcularValorPago(parcelas) {
    return parcelas
        .filter((p) => p.status === 'paga')
        .reduce((acc, p) => acc + p.valor, 0);
}
/**
 * Calcula somatório de parcelas pendentes
 */
export function calcularValorPendente(parcelas) {
    return parcelas
        .filter((p) => p.status === 'pendente' || p.status === 'vencida')
        .reduce((acc, p) => acc + p.valor, 0);
}
/**
 * Verifica se alguma parcela está vencida comparando com data atual
 */
export function temParcelaVencida(parcelas) {
    const hoje = new Date();
    return parcelas.some((p) => {
        if (p.status === 'paga')
            return false;
        const dataVencimento = new Date(p.data_vencimento);
        return dataVencimento < hoje;
    });
}
