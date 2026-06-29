import bcrypt from "bcryptjs";
import { FastifyInstance } from "fastify";

import { UserRepository } from "@/repositories/user.repository";
import { PasswordResetRepository } from "@/repositories/password-reset.repository";
import type {
  ForgotPasswordDTO,
  ResetPasswordDTO,
} from "@/schemas/password-reset.schema";

const userRepository = new UserRepository();
const tokenRepository = new PasswordResetRepository();

const EXPIRATION_MINUTES = 15;
const GENERIC_RESPONSE = {
  message:
    "Se o email estiver cadastrado, você receberá um código de recuperação.",
};

export class PasswordResetService {
  private app: FastifyInstance;

  constructor(app: FastifyInstance) {
    this.app = app;
  }

  async requestPasswordReset(data: ForgotPasswordDTO) {
    const user = await userRepository.findByEmail(data.email);

    if (user) {
      await tokenRepository.invalidatePreviousTokens(user.id);

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000);

      await tokenRepository.create(user.id, code, expiresAt);

      await this.app.sendEmail(
        user.email,
        "Código de recuperação de senha — iClass",
        `<h3>Solicitação de Alteração de Senha na Plataforma IClass</h3>
        <p>Seu código de recuperação é: <strong>${code}</strong></p>
        <p>Ele expira em ${EXPIRATION_MINUTES} minutos.</p><br>
        <small>Caso não tenha sido feita por você está solicitação, apenas desconsidere esse e-mail.</small><br>
        <small>© IClass - 2026</small>
        `,
      );
    }

    return GENERIC_RESPONSE;
  }

  async resetPassword(data: ResetPasswordDTO) {
    const user = await userRepository.findByEmail(data.email);

    if (!user) {
      throw Object.assign(new Error("Código inválido ou expirado"), {
        statusCode: 400,
      });
    }

    const token = await tokenRepository.findActiveByUserIdAndCode(
      user.id,
      data.code,
    );

    if (!token) {
      throw Object.assign(new Error("Código inválido ou expirado"), {
        statusCode: 400,
      });
    }

    await tokenRepository.markAsUsed(token.id);

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await userRepository.update(user.id, { password: hashedPassword });

    return { message: "Senha redefinida com sucesso." };
  }
}
