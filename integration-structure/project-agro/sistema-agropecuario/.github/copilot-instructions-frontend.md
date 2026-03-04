# Instruções para Desenvolvimento Frontend - Sistema Agropecuário

## Visão Geral
Este documento guia o desenvolvimento do frontend do Sistema Agropecuário, focando em aceleração e eficiência enquanto mantém qualidade e conformidade com as regras gerais do projeto.

## Stack Tecnológico
- **React 19** + **TypeScript 5.6+**
- **Vite** para build e dev server
- **TanStack Query v5+** para data fetching
- **Axios** para API calls
- **Bootstrap 5** para UI
- **React Leaflet** para mapas
- **Chart.js** para gráficos
- **Yup** para validação
- **Jest** para testes

## Estrutura de Diretórios
```
frontend/src/
├── components/          # Componentes reutilizáveis
├── modules/            # Módulos específicos (Fazendas, Animais, etc.)
├── services/           # API services e utilities
├── types/              # TypeScript interfaces
├── utils/              # Funções auxiliares
├── hooks/              # Custom hooks
└── pages/              # Páginas principais
```

## Regras Gerais
1. **TypeScript Obrigatório**: Todos os componentes devem ser tipados.
2. **Validação com Yup**: Formulários devem ter validação robusta.
3. **Testes com Jest**: Cobertura mínima de 70% para componentes críticos.
4. **Responsividade**: Usar Bootstrap para mobile-first design.
5. **Acessibilidade**: Seguir WCAG 2.1 guidelines.
6. **Performance**: Lazy loading para componentes pesados, otimização de imagens.

## Fases de Desenvolvimento (7 Fases Simplificadas)
### 1. Setup Inicial
- Instalar dependências: `npm install`
- Configurar Vite e TypeScript
- Setup básico de autenticação (useAuth hook)

### 2. Estrutura Base
- Criar estrutura de pastas
- Implementar layout principal (Header, Sidebar, Footer)
- Configurar roteamento com React Router

### 3. Componentes Core
- Desenvolver componentes base (Button, Input, Modal)
- Implementar sistema de notificações
- Criar hooks customizados (useApi, useLocalStorage)

### 4. Módulos Principais
- Dashboard com mapas e gráficos
- Módulo Fazendas (CRUD com GIS)
- Módulo Animais (gestão de rebanho)
- Módulo Produção (relatórios e analytics)

### 5. Integração e APIs
- Conectar com backend Django
- Implementar real-time com WebSockets/polling
- Gerenciar estado global com Context API

### 6. Testes e Validação
- Escrever testes unitários e de integração
- Testar responsividade e acessibilidade
- Validação end-to-end com Cypress (opcional)

### 7. Deploy e Otimização
- Build de produção: `npm run build`
- Otimização de bundle
- Configuração de CI/CD

## Aceleração de Desenvolvimento
- **Prototipagem Rápida**: Comece com componentes básicos, refine com validação posterior.
- **Snippets Prontos**: Use templates para CRUD operations.
- **Mocks Iniciais**: Desenvolva com dados mockados antes da API.
- **Ferramentas**: Utilize React DevTools, Lighthouse para performance.

## Exemplo de Componente: MapViewer
```tsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Farm {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

interface MapViewerProps {
  farms: Farm[];
}

const MapViewer: React.FC<MapViewerProps> = ({ farms }) => {
  return (
    <MapContainer center={[-15.7801, -47.9292]} zoom={4} style={{ height: '400px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {farms.map(farm => (
        <Marker key={farm.id} position={[farm.lat, farm.lng]}>
          <Popup>{farm.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapViewer;
```

## Boas Práticas
- **Commits**: "feat: add MapViewer component" ou "fix: responsive layout".
- **Code Review**: Sempre revisar PRs antes do merge.
- **Documentação**: Atualizar README.md com novas features.
- **Segurança**: Nunca expor tokens ou dados sensíveis.

## Troubleshooting
- **Build Errors**: Verificar TypeScript types e dependências.
- **Performance**: Usar React.memo para componentes pesados.
- **API Issues**: Verificar CORS e autenticação JWT.