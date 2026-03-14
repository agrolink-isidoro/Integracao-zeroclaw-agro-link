// ========================================
// SELETOR DE TIPO DE CONTRATO
// ========================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShoppingCart, TrendingUp, DollarSign, ArrowRight, Package, Briefcase, PiggyBank } from 'lucide-react';

interface ContratoTypeOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  examples: string[];
  features: string[];
}

const CONTRATO_TYPES: ContratoTypeOption[] = [
  {
    id: 'compra',
    label: 'Contrato de Compra',
    description: 'Compra de matérias-primas, insumos e produtos agropecuários',
    icon: <ShoppingCart className="h-8 w-8" />,
    color: 'from-blue-500 to-blue-600',
    route: '/comercial/contratos/compra/criar',
    examples: ['Compra de sementes', 'Fertilizantes', 'Máquinas usadas', 'Serviços agrícolas'],
    features: [
      'Múltiplos itens com desconto',
      'Fornecedor com representante legal',
      'Condições de pagamento e garantia',
      'Suporte a Barter (troca)',
      'Frete incluído ou separado',
    ],
  },
  {
    id: 'venda',
    label: 'Contrato de Venda',
    description: 'Venda de produtos agrícolas, commodities e derivados',
    icon: <TrendingUp className="h-8 w-8" />,
    color: 'from-green-500 to-green-600',
    route: '/comercial/contratos/venda/criar',
    examples: [
      'Venda de soja',
      'Grãos futuros',
      'Produtos processados',
      'Contratos parcelados',
      'Venda com antecipação',
    ],
    features: [
      'Diversos tipos: à vista, parcelado, futuro, spot',
      'Geração automática de parcelas',
      'Rastreamento: lote, colheita, certificações',
      'Histórico de cliente',
      'Suporte a Barter',
      'Entrega e transportadora',
    ],
  },
  {
    id: 'financeiro',
    label: 'Produtos Financeiros',
    description: 'Contratos de investimento, seguros e aplicações financeiras',
    icon: <DollarSign className="h-8 w-8" />,
    color: 'from-amber-500 to-amber-600',
    route: '/comercial/contratos/financeiro/criar',
    examples: [
      'Consórcio imobiliário',
      'Seguro de safra',
      'Aplicações financeiras',
      'Investimentos',
      'Seguros agrícolas',
    ],
    features: [
      'Consórcio: cotas, sorteios, rateio',
      'Seguro: apólice, cobertura, franquia',
      'Aplicação: taxa prefixada/pospixada/flutuante',
      'Cálculo automático de rendimentos',
      'Múltiplos documentos',
      'Resumo executivo',
    ],
  },
];

interface ContratoTypeSelectorProps {
  onSelect?: (type: string) => void;
  showDialog?: boolean;
  trigger?: React.ReactNode;
}

export const ContratoTypeSelector: React.FC<ContratoTypeSelectorProps> = ({
  onSelect,
  showDialog = false,
  trigger,
}) => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(showDialog);

  const handleSelect = (typeId: string, route: string) => {
    setSelectedType(typeId);
    if (onSelect) {
      onSelect(typeId);
    } else {
      navigate(route);
    }
    setOpenDialog(false);
  };

  const content = (
    <div className="w-full max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-2">Criar Novo Contrato</h1>
        <p className="text-xl text-muted-foreground">
          Selecione o tipo de contrato que deseja criar
        </p>
      </div>

      {/* Grid de Tipos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {CONTRATO_TYPES.map((type) => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedType === type.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleSelect(type.id, type.route)}
          >
            <CardHeader>
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-4`}>
                {type.icon}
              </div>
              <CardTitle>{type.label}</CardTitle>
              <CardDescription>{type.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Exemplos */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Exemplos:</h4>
                <ul className="text-sm space-y-1">
                  {type.examples.map((example, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-primary mt-1">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recursos */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Recursos:</h4>
                <ul className="text-xs space-y-1">
                  {type.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botão */}
              <Button
                className="w-full mt-4 group"
                onClick={() => handleSelect(type.id, type.route)}
              >
                Criar {type.label}
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <Package className="h-4 w-4" />
        <AlertDescription>
          <strong>Dica:</strong> Todos os contratos podem ser salvos como rascunho e editados posteriormente. Não serão enviados para a produção até que você aprovação.
        </AlertDescription>
      </Alert>
    </div>
  );

  // Se for modal dialog
  if (showDialog) {
    return (
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Contrato</DialogTitle>
            <DialogDescription>Selecione o tipo de contrato que deseja criar</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {CONTRATO_TYPES.map((type) => (
              <Card
                key={type.id}
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={() => handleSelect(type.id, type.route)}
              >
                <CardHeader>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-2`}>
                    {type.icon}
                  </div>
                  <CardTitle className="text-base">{type.label}</CardTitle>
                  <CardDescription className="text-xs">{type.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" className="w-full">
                    Criar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Se for página
  return content;
};

export default ContratoTypeSelector;
