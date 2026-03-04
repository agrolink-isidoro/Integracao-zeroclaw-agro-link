# Dados de instituições financeiras brasileiras
# Incluindo: Bancos comerciais, Fintechs, Cooperativas de Crédito, Bancos Regionais
# Fonte: Wikipedia - List of banks in Brazil, BACEN, Cooperativas Brasileiras
INSTITUICOES_FINANCEIRAS = [
    # Bancos Comerciais Principais
    {
        'codigo_bacen': '00000000',
        'nome': 'BANCO CENTRAL DO BRASIL',
        'nome_reduzido': 'BANCO CENTRAL',
        'segmento': 'banco_central',
    },
    {
        'codigo_bacen': '001',
        'nome': 'BANCO DO BRASIL S.A.',
        'nome_reduzido': 'BRASIL',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '033',
        'nome': 'BANCO SANTANDER (BRASIL) S.A.',
        'nome_reduzido': 'SANTANDER',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '104',
        'nome': 'CAIXA ECONÔMICA FEDERAL',
        'nome_reduzido': 'CAIXA',
        'segmento': 'caixa_economica',
    },
    {
        'codigo_bacen': '237',
        'nome': 'BANCO BRADESCO S.A.',
        'nome_reduzido': 'BRADESCO',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '341',
        'nome': 'ITAÚ UNIBANCO S.A.',
        'nome_reduzido': 'ITAUTEC',
        'segmento': 'banco_multiplo',
    },
    {
        'codigo_bacen': '389',
        'nome': 'BANCO MERCANTIL DO BRASIL S.A.',
        'nome_reduzido': 'MERCANTIL',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '422',
        'nome': 'BANCO SAFRA S.A.',
        'nome_reduzido': 'SAFRA',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '033',
        'nome': 'BANCO VOTORANTIM S.A.',
        'nome_reduzido': 'VOTORANTIM',
        'segmento': 'banco_multiplo',
    },
    {
        'codigo_bacen': '477',
        'nome': 'CITIBANK N.A.',
        'nome_reduzido': 'CITIBANK',
        'segmento': 'banco_comercial',
    },
    # Fintechs e Bancos Digitais
    {
        'codigo_bacen': '260',
        'nome': 'NU PAGAMENTOS S.A. (NUBANK)',
        'nome_reduzido': 'NUBANK',
        'segmento': 'banco_multiplo',
    },
    {
        'codigo_bacen': '336',
        'nome': 'BANCO C6 CONSIGNADO S.A.',
        'nome_reduzido': 'C6 BANK',
        'segmento': 'banco_multiplo',
    },
    {
        'codigo_bacen': '620',
        'nome': 'BANCO INTER S.A.',
        'nome_reduzido': 'INTER',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '655',
        'nome': 'BANCO SOFISA S.A.',
        'nome_reduzido': 'SOFISA',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '260',
        'nome': 'BANCO OUROCARD S.A.',
        'nome_reduzido': 'OUROCARD',
        'segmento': 'banco_multiplo',
    },
    # Bancos de Investimento
    {
        'codigo_bacen': '062',
        'nome': 'BANCO ITAUBANK S.A.',
        'nome_reduzido': 'ITAUBANK',
        'segmento': 'banco_investimento',
    },
    {
        'codigo_bacen': '113',
        'nome': 'BANCO AVISTA S.A.',
        'nome_reduzido': 'AVISTA',
        'segmento': 'banco_comercial',
    },
    # Cooperativas e Instituições Especializadas
    {
        'codigo_bacen': '748',
        'nome': 'BANCO SICURO S.A.',
        'nome_reduzido': 'SICURO',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '752',
        'nome': 'BANCO BNP PARIBAS BRASIL S.A.',
        'nome_reduzido': 'BNP PARIBAS',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '756',
        'nome': 'BANCO COOPERATIVO DO BRASIL S.A.',
        'nome_reduzido': 'BANCOOB',
        'segmento': 'banco_comercial',
    },
    # Bancos Regionais Importantes
    {
        'codigo_bacen': '004',
        'nome': 'BANCO DO NORDESTE DO BRASIL S.A.',
        'nome_reduzido': 'BNB',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '035',
        'nome': 'BANCO DA AMAZÔNIA S.A.',
        'nome_reduzido': 'BASA',
        'segmento': 'banco_desenvolvimento',
    },
    {
        'codigo_bacen': '037',
        'nome': 'BANCO DO ESTADO DO ESPÍRITO SANTO S.A.',
        'nome_reduzido': 'BANESTES',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '040',
        'nome': 'BANCO DO ESTADO DE SERGIPE S.A.',
        'nome_reduzido': 'BANESE',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '041',
        'nome': 'BANCO DO ESTADO DE SANTA CATARINA S.A.',
        'nome_reduzido': 'BESC',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '047',
        'nome': 'BANCO DO ESTADO DO RIO DE JANEIRO S.A.',
        'nome_reduzido': 'BANERJ',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '070',
        'nome': 'BANCO DE BRASÍLIA S.A.',
        'nome_reduzido': 'BRB',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '084',
        'nome': 'BANCO DE CRÉDITO IMOBILIÁRIO S.A.',
        'nome_reduzido': 'BCI',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '096',
        'nome': 'BANCO B&T S.A.',
        'nome_reduzido': 'B&T',
        'segmento': 'banco_comercial',
    },
    # Bancos com Foco em Pessoa Jurídica e PMEs
    {
        'codigo_bacen': '263',
        'nome': 'BANCO BMG S.A.',
        'nome_reduzido': 'BMG',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '318',
        'nome': 'BANCO BMG S.A.',
        'nome_reduzido': 'BANCO DAYCOVAL',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '121',
        'nome': 'BANCO PAULISTA S.A.',
        'nome_reduzido': 'PAULISTA',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '078',
        'nome': 'BANCO J.P. MORGAN S.A.',
        'nome_reduzido': 'JP MORGAN',
        'segmento': 'banco_investimento',
    },
    # Principais Cooperativas de Crédito
    {
        'codigo_bacen': '756',
        'nome': 'SICOOB - SISTEMA DE COOPERATIVAS DE CRÉDITO DO BRASIL',
        'nome_reduzido': 'SICOOB',
        'segmento': 'cooperativa_credito',
    },
    {
        'codigo_bacen': '654',
        'nome': 'SICRED - SISTEMA DE CRÉDITO COOPERATIVO',
        'nome_reduzido': 'SICRED',
        'segmento': 'cooperativa_credito',
    },
    {
        'codigo_bacen': '136',
        'nome': 'UNICRED - UNIÃO CRÉDITO',
        'nome_reduzido': 'UNICRED',
        'segmento': 'cooperativa_credito',
    },
    {
        'codigo_bacen': '012',
        'nome': 'AILOS - ASSOCIAÇÃO DE POUPANÇA E CRÉDITO',
        'nome_reduzido': 'AILOS',
        'segmento': 'cooperativa_credito',
    },
    {
        'codigo_bacen': '000',
        'nome': 'CRESOL - COOPERATIVA CENTRAL DE CRÉDITO RURAL SOLIDÁRIO',
        'nome_reduzido': 'CRESOL',
        'segmento': 'cooperativa_credito',
    },
    {
        'codigo_bacen': '000',
        'nome': 'CECRED - COOPERATIVA CENTRAL DE CRÉDITO',
        'nome_reduzido': 'CECRED',
        'segmento': 'cooperativa_credito',
    },
    {
        'codigo_bacen': '000',
        'nome': 'COOPEESCOLA - COOPERATIVA DE CRÉDITO',
        'nome_reduzido': 'COOPEESCOLA',
        'segmento': 'cooperativa_credito',
    },
    {
        'codigo_bacen': '000',
        'nome': 'COOPERATIVA DE CRÉDITO MÚTUO DOS SERVIDORES DE SÃO PAULO',
        'nome_reduzido': 'CRESSP',
        'segmento': 'cooperativa_credito',
    },
    # Bancos Especializados
    {
        'codigo_bacen': '011',
        'nome': 'BANCO MULTIBANK S.A.',
        'nome_reduzido': 'MULTIBANK',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '016',
        'nome': 'BM&FBOVESPA S.A.',
        'nome_reduzido': 'BMFBOVESPA',
        'segmento': 'bolsa_valores',
    },
    {
        'codigo_bacen': '060',
        'nome': 'BANCO MODAL S.A.',
        'nome_reduzido': 'MODAL',
        'segmento': 'banco_investimento',
    },
    # Bancos Estrangeiros com Operação no Brasil
    {
        'codigo_bacen': '003',
        'nome': 'BANCO DA CHINA',
        'nome_reduzido': 'BDC',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '100',
        'nome': 'HSBC BANK BRASIL S.A.',
        'nome_reduzido': 'HSBC',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '007',
        'nome': 'BANCO NACIONAL DE DESENVOLVIMENTO ECONÔMICO E SOCIAL',
        'nome_reduzido': 'BNDES',
        'segmento': 'banco_desenvolvimento',
    },
    # Gestoras e Administradoras
    {
        'codigo_bacen': '000',
        'nome': 'XP INVESTIMENTOS S.A.',
        'nome_reduzido': 'XP',
        'segmento': 'corretora_valores',
    },
    {
        'codigo_bacen': '000',
        'nome': 'BTG PACTUAL S.A.',
        'nome_reduzido': 'BTG PACTUAL',
        'segmento': 'banco_investimento',
    },
    {
        'codigo_bacen': '000',
        'nome': 'ITAU UNIBANCO HOLDING S.A.',
        'nome_reduzido': 'ITAU HOLDING',
        'segmento': 'holding_financeira',
    },
    # Bancos Especializados em Crédito Consignado
    {
        'codigo_bacen': '157',
        'nome': 'BANCO ITAUBANK S.A.',
        'nome_reduzido': 'ITAUBANK',
        'segmento': 'banco_comercial',
    },
    {
        'codigo_bacen': '172',
        'nome': 'BANCO BMG S.A.',
        'nome_reduzido': 'BMG CONSIGNADO',
        'segmento': 'banco_comercial',
    },
]
