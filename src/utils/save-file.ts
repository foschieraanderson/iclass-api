import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { uuidv7 } from 'uuidv7'
import type { MultipartFile } from '@fastify/multipart'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

export async function saveFile(part: MultipartFile): Promise<string> {
  if (part.mimetype !== 'application/pdf') {
    await part.toBuffer()
    throw Object.assign(new Error('Apenas arquivos PDF são permitidos'), { statusCode: 400 })
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const filename = `${uuidv7()}-${part.filename}`
  const dest = path.join(UPLOAD_DIR, filename)
  await pipeline(part.file, fs.createWriteStream(dest))
  return `/uploads/${filename}`
}
