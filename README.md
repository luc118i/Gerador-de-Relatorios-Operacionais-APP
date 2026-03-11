
# 📋 Gerador de Relatórios Operacionais

Sistema desenvolvido para facilitar o registro, visualização e geração de documentos PDF baseados em ocorrências diárias de motoristas e frotas.

## 🚀 Tecnologias

Este projeto utiliza as seguintes tecnologias:

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/)

📂 Estrutura de Pastas
O projeto segue uma arquitetura modular, separando responsabilidades entre dados, lógica de negócio e interface:

Plaintext
src/
├── api/             # Infraestrutura e chamadas HTTP
│   ├── http/        # Configurações globais (Axios/Fetch)
│   └── *.api.ts     # Serviços de busca (drivers, occurrences, reports)
│
├── app/             # Camada de Visualização (UI)
│   ├── components/  # Componentes reutilizáveis de interface
│   ├── pages/       # Páginas principais da aplicação
│   └── utils/       # Helpers de UI e formatação local
│
├── domain/          # Regras de Negócio e Contratos
│   └── *.ts         # Tipagens, Interfaces e DTOs (Data Transfer Objects)
│
├── features/        # Módulos isolados por funcionalidade
│   ├── occurrences/ # Lógica de Ocorrências (Queries, Payloads, Keys)
│   └── reportsPdf/  # Lógica específica para geração de PDFs
│
├── shared/          # Recursos compartilhados entre múltiplos módulos
├── styles/          # Estilização global e configurações de tema
├── catalogs/        # Arquivos de dados estáticos ou catálogos
└── data/            # Mock de dados ou persistência local temporária
Detalhes das Camadas:
API: Centraliza toda a comunicação com o backend, garantindo que o resto do app não precise saber os endpoints de cor.

App: Onde o React "vive". Foca em como os dados aparecem para o usuário.

Domain: A "verdade" dos dados. Se o formato de uma ocorrência mudar no banco, é aqui que alteramos primeiro.

Features: Organiza o código por domínio de funcionalidade em vez de tipo de arquivo, facilitando a manutenção e escala.
## 🛠️ Instalação e Execução

1. Clone o repositório:
   ```bash
   git clone [[https://github.com/seu-usuario/gerador-relatorios.git\](https://github.com/seu-usuario/gerador-relatorios.git](https://github.com/luc118i/Gerador-de-Relatorios-Operacionais-APP))
Instale as dependências:

Bash
npm install
Configure as variáveis de ambiente (Crie um arquivo .env baseado no .env.development).

Inicie o servidor de desenvolvimento:

Bash
npm run dev
Desenvolvido para otimização de processos logísticos.

