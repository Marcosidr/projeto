export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const naoEncontrado = (recurso: string) =>
  new AppError(`${recurso} não encontrado(a).`, 404);

export const proibido = (mensagem = 'Você não tem permissão para esta operação.') =>
  new AppError(mensagem, 403);

export const conflito = (mensagem: string) => new AppError(mensagem, 409);
