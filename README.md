# iClass API

REST API da plataforma iClass — gerencia usuários, turmas e recursos relacionados.

## Tecnologias

- **[Fastify](https://fastify.dev/)** — framework HTTP de alta performance
- **[Prisma](https://www.prisma.io/)** — ORM com type-safety e migrations
- **[PostgreSQL](https://www.postgresql.org/)** — banco de dados relacional
- **[Zod](https://zod.dev/)** — validação de schemas em runtime e inferência de tipos
- **[JWT](https://jwt.io/)** — autenticação via `@fastify/jwt`
- **[TypeScript](https://www.typescriptlang.org/)** — tipagem estática
- **[Swagger UI](http://localhost:3000/docs)** — documentação interativa da API
- **[Nodemailer](https://nodemailer.com/)** — envio de emails transacionais (recuperação de senha)

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 10
- [Docker](https://www.docker.com/) (para o banco de dados)

## Instalação

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd iclass-api
```

### 2. Instale as dependências

```bash
pnpm install
```

> O `postinstall` executa `prisma generate` automaticamente.

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` conforme necessário. Os valores padrão já funcionam com o Docker Compose.

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `3000` |
| `NODE_ENV` | Ambiente de execução | `development` |
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://postgres:postgres@localhost:5432/iclass` |
| `JWT_SECRET` | Chave secreta para assinar tokens JWT (mín. 32 chars) | — |
| `SMTP_HOST` | Endereço do servidor SMTP | — |
| `SMTP_PORT` | Porta SMTP | `587` |
| `SMTP_USER` | Usuário de autenticação SMTP | — |
| `SMTP_PASS` | Senha de autenticação SMTP | — |
| `SMTP_FROM` | Remetente dos emails (ex: `"iClass <noreply@example.com>"`) | — |

Para gerar um `JWT_SECRET` seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Suba o banco de dados

```bash
docker compose up -d
```

### 5. Execute as migrations

```bash
pnpm db:migrate
```

### 6. Inicie o servidor

```bash
pnpm dev
```

A API estará disponível em `http://localhost:3000`.  
A documentação interativa em `http://localhost:3000/docs`.

---

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `pnpm dev` | Inicia o servidor em modo watch (hot reload) |
| `pnpm build` | Compila o TypeScript para `dist/` |
| `pnpm start` | Inicia o servidor compilado (`dist/server.js`) |
| `pnpm lint` | Executa o ESLint |
| `pnpm db:migrate` | Cria e aplica migrations pendentes |
| `pnpm db:generate` | Gera o cliente Prisma a partir do schema |
| `pnpm db:studio` | Abre o Prisma Studio (interface visual do banco) |

---

## Endpoints

### Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/auth/login` | — | Retorna um JWT access token |
| `POST` | `/auth/forgot-password` | — | Envia código de 6 dígitos para o email (expira em 15 min) |
| `POST` | `/auth/reset-password` | — | Valida o código e redefine a senha |

**Exemplo de login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@email.com", "password": "123456"}'
```

**Resposta:**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Exemplo de recuperação de senha:**
```bash
# 1. Solicitar código
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@email.com"}'

# 2. Redefinir senha com o código recebido por email
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@email.com", "code": "482910", "newPassword": "novaSenha123"}'
```

### Usuários

Rotas protegidas exigem o header `Authorization: Bearer <token>`.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/users` | — | Cria um novo usuário |
| `GET` | `/users` | JWT | Lista todos os usuários |
| `GET` | `/users/:id` | JWT | Retorna um usuário pelo ID |
| `PATCH` | `/users/:id` | JWT | Atualiza parcialmente um usuário |
| `DELETE` | `/users/:id` | JWT | Remove um usuário |

**Campos do usuário:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | `string` | Sim | Nome completo (3–100 chars) |
| `email` | `string` | Sim | E-mail único |
| `password` | `string` | Sim | Senha (mín. 6 chars) |
| `role` | `admin` \| `teacher` \| `student` | Não | Perfil (padrão: `student`) |

---

## Testando com o Swagger UI

1. Abra `http://localhost:3000/docs`
2. Use `POST /auth/login` para obter um token
3. Clique em **Authorize** (cadeado no topo da página)
4. Cole o token e clique em **Authorize**
5. Todos os endpoints protegidos passarão a enviar o header automaticamente

---

## Estrutura do projeto

```
iclass-api/
├── compose.yml               # Docker Compose (PostgreSQL)
├── prisma.config.ts          # Configuração do Prisma CLI (Prisma 7)
├── database/
│   ├── schema.prisma         # Schema do banco de dados
│   └── migrations/           # Histórico de migrations
└── src/
    ├── server.ts             # Bootstrap e graceful shutdown
    ├── app.ts                # Instância do Fastify e registro de plugins
    ├── @types/
    │   └── fastify.d.ts      # Augmentação de tipos (authenticate)
    ├── config/
    │   ├── env.ts            # Validação de variáveis de ambiente (Zod)
    │   └── logger.ts         # Configuração do logger (pino)
    ├── plugins/
    │   ├── swagger.ts        # Documentação OpenAPI / Swagger UI
    │   ├── jwt.ts            # JWT plugin + decorator authenticate
    │   └── email.ts          # Nodemailer plugin + decorator sendEmail
    ├── routes/
    │   ├── index.ts          # Registro central de rotas
    │   ├── auth.route.ts     # Rotas de autenticação
    │   ├── user.route.ts     # Rotas de usuários
    │   └── class.route.ts    # Rotas de turmas
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── user.controller.ts
    │   ├── class.controller.ts
    │   └── password-reset.controller.ts
    ├── services/
    │   ├── auth.service.ts           # Validação de credenciais
    │   ├── user.service.ts           # Regras de negócio de usuário
    │   ├── class.service.ts          # Regras de negócio de turma
    │   └── password-reset.service.ts # Geração e validação de código de reset
    ├── repositories/
    │   ├── user.repository.ts          # Acesso ao banco via Prisma
    │   ├── class.repository.ts
    │   └── password-reset.repository.ts
    ├── schemas/
    │   ├── common.schema.ts        # Schemas compartilhados (errorSchema)
    │   ├── auth.schema.ts          # Schemas de autenticação
    │   ├── user.schema.ts          # Schemas de usuário
    │   ├── class.schema.ts         # Schemas de turma
    │   └── password-reset.schema.ts
    └── database/
        └── prisma.ts         # Singleton do PrismaClient
```
