# 🩺 MedSetup — Plataforma Inteligente de Estudos Médicos com IA

<div align="center">

![MedSetup Badge](https://img.shields.io/badge/MedSetup-v1.0.0-blue?style=for-the-badge&logo=medscape)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)

**Plataforma completa de estudos e resoluções clínicas com IA (Metodologia Ativa, PBL, Ateliê e Tutoria), otimizada para Desktop, Tablets (Samsung Galaxy Tab S6 Lite / iPad) e Celulares.**

</div>

---

## 📱 Suporte Completo a Dispositivos

- **🖥️ Desktop & Notebooks:** Navegação lateral retrátil, layout de 2 ou 3 colunas e telas amplas.
- **📱 Tablets (Samsung Galaxy Tab S6 Lite, iPads):** Menu gaveta com controle por toque e caneta (S Pen), colunas de pastas retráteis para leitura fluida de PDFs e casos clínicos em modo retrato ou paisagem.
- **📲 Celulares:** Interface 100% responsiva, botões com área de toque mínima de 44px, barra de pastas sanfonada e modais adaptáveis.

---

## 🚀 Principais Funcionalidades

1. **🏛️ Tutoria Médica & PBL:** Análise profunda de casos clínicos, formulação de hipóteses diagnósticas, raciocínio fisiopatológico e condutas terapêuticas.
2. **🔬 Ateliê & SP (Situação-Problema):** Resolução estruturada e exaustiva:
   - *Objetivos do Roteiro* (com menção objetiva de lâminas e tecidos histológicos);
   - *Resumo Completo* com correlações morfofuncionais e exames;
   - *Perguntas e Atividades do Roteiro* com casos clínicos e tabelas resolvidas;
   - *Destaques do Roteiro* para fixação imediata.
3. **📚 Banco de Questões com Estilo Simulado Anhembi:** Questões comentadas, cronômetro, layout de prova com enunciados no topo e alternativas acessíveis.
4. **🃏 Flashcards Inteligentes:** Sistema de repetição espaçada (Fácil, Médio, Difícil) com geração automática a partir de tutorias e SPs.
5. **🧠 Mapas Mentais Interativos (React Flow):** Visualização conceitual hierárquica e expansão de nós via IA.
6. **📝 Anotações Clínicas & Macetes:** Editor rico com destaques temáticos (Regra de Ouro, Tratamento, Red Flags, Diagnóstico) e sistema independente de pastas.
7. **🎙️ Gravação & Transcrição:** Transcrição de áudio de aulas médicas com geração de resumos em tópicos.
8. **📑 Biblioteca & Leitor de Imagens:** Suporte a livros e lâminas histológicas.

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Estado Global:** [Zustand](https://github.com/pmndrs/zustand) com persistência local (`localStorage`)
- **Visualização de Grafos:** [@xyflow/react (React Flow)](https://reactflow.dev/)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Geração de PDFs:** [jsPDF](https://github.com/parallax/jsPDF)

---

## 📦 Como Instalar e Rodar Localmente

### Pré-requisitos:
- [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada)
- `npm` ou `yarn` / `pnpm`

### Passos:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/medsetup.git
   cd medsetup
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env.local
   ```
   *(Você também pode configurar suas chaves de API do Google Gemini ou OpenAI diretamente dentro da interface do aplicativo na aba **Configurações**).*

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no seu navegador: [http://localhost:3000](http://localhost:3000)

5. **Para compilar e rodar em produção:**
   ```bash
   npm run build
   npm run start
   ```

---

## 📁 Estrutura de Pastas

```text
medsetup/
├── public/                 # Arquivos estáticos e pranchas histológicas
│   └── uploads/            # Pasta para uploads locais
├── src/
│   ├── app/                # Rotas do Next.js (App Router)
│   │   ├── (study)/        # Rotas dos módulos de estudo (tutoria, atelie, flashcards, questions, etc.)
│   │   └── api/            # Endpoints backend de IA (Gemini/OpenAI) e upload
│   ├── components/         # Componentes React modularizados
│   │   ├── anotacoes/      # Editor de anotações e regras de ouro
│   │   ├── atelie/         # Visualizadores e editores de Ateliê/SP
│   │   ├── common/         # Componentes reutilizáveis (VerticalFolderSidebar, Modais de Pastas)
│   │   ├── flashcards/     # Sistema de estudo de flashcards
│   │   ├── layout/         # Header responsivo, Sidebar com Drawer e navegação
│   │   ├── questions/      # Banco de questões e Modo Simulado
│   │   └── tutoria/        # Visualizador e editor de Tutoria/PBL
│   ├── lib/                # Funções utilitárias, analisadores e conversores
│   └── stores/             # Estado global Zustand (useAppStore.ts)
├── .env.example            # Modelo de variáveis de ambiente
├── .gitignore              # Proteção contra uploads pesados e arquivos sensíveis
├── package.json            # Dependências e scripts
└── tsconfig.json           # Configurações TypeScript
```

---

## 🔒 Segurança & Privacidade
- Nenhum arquivo pesado (> 100MB) é rastreado pelo Git graças ao `.gitignore` pré-configurado.
- Chaves de API e arquivos de ambiente (`.env*`) são mantidos estritamente locais.

---

<div align="center">
Desenvolvido com carinho para estudantes e profissionais da Medicina.
</div>
