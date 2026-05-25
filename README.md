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
| `pnpm test` | Roda toda a suíte de testes (unitários + integração) |
| `pnpm test:unit` | Roda apenas os testes unitários |
| `pnpm test:integration` | Roda apenas os testes de integração |
| `pnpm test:watch` | Modo watch para desenvolvimento |
| `pnpm test:coverage` | Gera relatório de cobertura em `coverage/` |
| `pnpm db:test:migrate` | Aplica migrations no banco de teste (`iclass_test`) |
| `pnpm db:test:reset` | Reseta o banco de teste |

---

## Endpoints

Todos os endpoints estão sob o prefixo `/api/v1`.

### Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | — | Retorna `accessToken` (1h) e `refreshToken` (7d) |
| `POST` | `/api/v1/auth/refresh` | — | Troca o `refreshToken` por um novo `accessToken` |
| `POST` | `/api/v1/auth/forgot-password` | — | Envia código de 6 dígitos para o email (expira em 15 min) |
| `POST` | `/api/v1/auth/reset-password` | — | Valida o código e redefine a senha |

**Exemplo de login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@email.com", "password": "senha123"}'
```

**Resposta:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Renovar o access token:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'
```

**Exemplo de recuperação de senha:**
```bash
# 1. Solicitar código
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@email.com"}'

# 2. Redefinir senha com o código recebido por email
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@email.com", "code": "482910", "newPassword": "novaSenha123"}'
```

### Usuários

Rotas protegidas exigem o header `Authorization: Bearer <accessToken>`.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/users` | admin | Cria um novo usuário |
| `GET` | `/api/v1/users` | JWT | Lista todos os usuários |
| `GET` | `/api/v1/users/me` | JWT | Retorna os dados do próprio usuário autenticado |
| `GET` | `/api/v1/users/:id` | JWT | Retorna um usuário pelo ID |
| `PATCH` | `/api/v1/users/:id` | JWT | Atualiza parcialmente um usuário |
| `DELETE` | `/api/v1/users/:id` | JWT | Remove um usuário |

**Campos do usuário:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | `string` | Sim | Nome completo (3–100 chars) |
| `email` | `string` | Sim | E-mail único |
| `password` | `string` | Sim | Senha (mín. 6 chars) |
| `role` | `admin` \| `teacher` \| `student` | Não | Perfil (padrão: `student`) |

### Turmas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/classes` | admin | Cria uma turma com professor e alunos |
| `GET` | `/api/v1/classes` | JWT | Lista todas as turmas |
| `GET` | `/api/v1/classes/:id` | JWT | Retorna uma turma pelo ID |
| `GET` | `/api/v1/classes/:id/report` | JWT | Relatório de notas da turma por aluno |
| `PATCH` | `/api/v1/classes/:id` | admin | Atualiza turma (período, série, professor, alunos) |
| `DELETE` | `/api/v1/classes/:id` | admin | Remove uma turma |
| `POST` | `/api/v1/classes/:id/students` | admin | Adiciona alunos à turma (idempotente) |
| `DELETE` | `/api/v1/classes/:id/students` | admin | Remove alunos da turma (idempotente) |

O campo `code` é gerado automaticamente a partir de `period` + `grade` (ex: `"2026/1-3A"`).

**Relatório de notas (`GET /classes/:id/report`):** retorna todas as tasks da turma com o status de entrega e nota de cada aluno matriculado. Teachers só podem acessar o relatório das próprias turmas; admin acessa qualquer uma.

### Tarefas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/tasks` | admin \| teacher | Cria uma tarefa (multipart/form-data, aceita arquivo) |
| `GET` | `/api/v1/tasks` | JWT | Lista tarefas — admin/teacher veem as próprias; alunos veem as da turma |
| `GET` | `/api/v1/tasks/:id` | JWT | Retorna uma tarefa pelo ID |
| `PATCH` | `/api/v1/tasks/:id` | admin \| teacher | Atualiza tarefa (teacher: apenas da própria turma) |
| `DELETE` | `/api/v1/tasks/:id` | admin \| teacher | Remove tarefa (teacher: apenas da própria turma) |

O campo `score` aceita apenas valores da sequência de Fibonacci: `1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144`.

### Submissões

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/tasks/:taskId/submissions` | student | Envia resposta à tarefa (multipart — texto e/ou arquivo) |
| `GET` | `/api/v1/tasks/:taskId/submissions` | teacher \| admin | Lista submissões de uma tarefa |
| `GET` | `/api/v1/submissions/mine` | student | Lista as próprias submissões |
| `GET` | `/api/v1/submissions/:id` | JWT | Retorna uma submissão (student: apenas a própria) |
| `PATCH` | `/api/v1/submissions/:id` | teacher \| admin | Avalia a submissão (`grade` + `feedback`) |

---

## Testes

A suíte cobre 6 services (unitários) e 5 grupos de endpoints (integração), totalizando 163 testes.

### Pré-requisitos

```bash
# criar banco de teste e aplicar migrations
createdb iclass_test
pnpm db:test:migrate
```

### Rodando os testes

```bash
pnpm test               # toda a suíte
pnpm test:unit          # só unitários (sem banco)
pnpm test:integration   # só integração (requer iclass_test)
pnpm test:coverage      # com relatório de cobertura
```

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
├── vitest.config.ts          # Configuração do Vitest
├── .env.test                 # Variáveis de ambiente para testes
├── database/
│   ├── schema.prisma         # Schema do banco de dados
│   └── migrations/           # Histórico de migrations
└── src/
    ├── server.ts             # Bootstrap e graceful shutdown
    ├── app.ts                # Instância do Fastify, plugins e buildApp() para testes
    ├── @types/
    │   └── fastify.d.ts      # Augmentação de tipos (authenticate, sendEmail)
    ├── config/
    │   ├── env.ts            # Validação de variáveis de ambiente (Zod)
    │   └── logger.ts         # Configuração do logger (pino)
    ├── middlewares/
    │   └── require-role.ts   # Factory requireRole — RBAC por hook
    ├── plugins/
    │   ├── swagger.ts        # Documentação OpenAPI / Swagger UI
    │   ├── jwt.ts            # JWT plugin + decorator authenticate
    │   ├── email.ts          # Nodemailer plugin + decorator sendEmail
    │   ├── multipart.ts      # @fastify/multipart (10 MB, 1 arquivo)
    │   └── static.ts         # @fastify/static — serve /uploads
    ├── utils/
    │   └── save-file.ts      # Salva upload em disco, retorna filename
    ├── routes/
    │   ├── index.ts          # Registro central de rotas
    │   ├── auth.route.ts
    │   ├── user.route.ts
    │   ├── class.route.ts
    │   ├── task.route.ts
    │   └── submission.route.ts
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── user.controller.ts
    │   ├── class.controller.ts
    │   ├── password-reset.controller.ts
    │   ├── task.controller.ts
    │   └── submission.controller.ts
    ├── services/
    │   ├── auth.service.ts
    │   ├── user.service.ts
    │   ├── class.service.ts
    │   ├── password-reset.service.ts
    │   ├── task.service.ts
    │   └── submission.service.ts
    ├── repositories/
    │   ├── user.repository.ts
    │   ├── class.repository.ts
    │   ├── password-reset.repository.ts
    │   ├── task.repository.ts
    │   └── submission.repository.ts
    ├── schemas/
    │   ├── common.schema.ts
    │   ├── auth.schema.ts
    │   ├── user.schema.ts
    │   ├── class.schema.ts
    │   ├── password-reset.schema.ts
    │   ├── task.schema.ts
    │   └── submission.schema.ts
    ├── database/
    │   └── prisma.ts         # Singleton do PrismaClient
    └── tests/
        ├── setup.ts                        # Carrega .env.test antes dos testes
        ├── helpers/
        │   ├── app.ts                      # getTestApp(), signToken(), bearerHeader()
        │   ├── database.ts                 # cleanDatabase()
        │   ├── fixtures.ts                 # seed helpers (seedAdmin, seedClass, etc.)
        │   └── multipart.ts                # buildMultipartBody()
        ├── unit/                           # Mocks de repositório — sem banco
        │   ├── auth.service.test.ts
        │   ├── user.service.test.ts
        │   ├── class.service.test.ts
        │   ├── task.service.test.ts
        │   ├── submission.service.test.ts
        │   └── password-reset.service.test.ts
        └── integration/                    # Banco real (iclass_test)
            ├── auth.routes.test.ts
            ├── user.routes.test.ts
            ├── class.routes.test.ts
            ├── task.routes.test.ts
            └── submission.routes.test.ts
```
