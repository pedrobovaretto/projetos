
## Plano: Reorganizar dashboard + adicionar página de Produtos + navegação multi-página

### 1. Simplificar a home (Index.tsx)

Remover os 4 cards atuais (Entradas, Saídas, Saldo em estoque, Investido) e substituir por **um bloco grande "Saldo por produto" com filtro**:

- `Select` grande com busca por nome do produto (usando `Command` do shadcn pra busca fluida)
- Ao escolher um produto, mostra em destaque:
  - Nome · classe · unidade · princípio ativo
  - **Entradas** (qtd) · **Saídas** (qtd) · **Saldo atual** (qtd)
  - **Valor investido** (R$)
- Estado inicial (sem produto): linha compacta com total de movimentações + total investido geral, só pra não ficar vazio.

### 2. Navegação multi-página

Usando `react-router-dom` (já instalado):

- **`/`** — Home (bloco de saldo por produto + prévia das últimas 10 movimentações)
- **`/produtos`** — Lista dos 119 produtos cadastrados
- **`/movimentacoes`** — Tabela completa de movimentações com filtros (move da home pra cá)

**Header** (`AppHeader.tsx`): adicionar links de navegação (Início · Produtos · Movimentações) usando `NavLink` (já existe `src/components/NavLink.tsx`), com destaque do link ativo. No mobile, vira menu hambúrguer (`Sheet` do shadcn).

### 3. Nova página `/produtos`

`src/pages/Produtos.tsx` — tabela com:
- Código · Nome · Classe · Princípio Ativo · Unidade · Saldo atual
- Campo de busca (filtra por nome / classe / princípio ativo)
- Filtro por classe (Select)
- Apenas visualização nesta etapa (CRUD completo fica como próximo passo separado)

### 4. Nova página `/movimentacoes`

`src/pages/Movimentacoes.tsx` — apenas move a seção `<MovementsTable />` da home pra cá, com cabeçalho próprio. A home mantém uma prévia das últimas 10 com link "Ver todas".

### Arquivos
- **Editar:** `src/App.tsx` (registrar `/produtos` e `/movimentacoes`)
- **Editar:** `src/pages/Index.tsx` (remover cards, adicionar bloco de saldo + prévia)
- **Editar:** `src/components/AppHeader.tsx` (nav links + menu mobile)
- **Criar:** `src/pages/Produtos.tsx`
- **Criar:** `src/pages/Movimentacoes.tsx`
- **Criar:** `src/components/ProductBalanceCard.tsx` (bloco de saldo por produto)

### Fora do escopo (próximos passos sugeridos)
- Cadastrar/editar/excluir produtos pela UI (CRUD)
- Filtrar movimentações por produto ao clicar na linha de Produtos
