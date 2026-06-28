import 'dotenv/config'
import { input, password, select } from '@inquirer/prompts'

import { UserService } from '@/services/user.service'
import type { Role } from '@/database/schema'

const service = new UserService()

async function main() {
  console.log('=== iClass — Criar usuário ===\n')

  const name = await input({
    message: 'Nome:',
    validate: (v) => v.trim().length > 0 || 'Nome é obrigatório',
  })

  const email = await input({
    message: 'Email:',
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
  })

  const pwd = await password({
    message: 'Senha:',
    validate: (v) => v.length >= 6 || 'Mínimo 6 caracteres',
  })

  const role = await select<Role>({
    message: 'Role:',
    choices: [
      { value: 'admin', name: 'Admin' },
      { value: 'teacher', name: 'Professor' },
      { value: 'student', name: 'Aluno' },
    ],
  })

  const user = await service.create({ name, email, password: pwd, role })

  console.log('\nUsuário criado com sucesso:')
  console.log(`  ID:    ${user.id}`)
  console.log(`  Nome:  ${user.name}`)
  console.log(`  Email: ${user.email}`)
  console.log(`  Role:  ${user.role}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('\nErro:', err.message ?? err)
  process.exit(1)
})
