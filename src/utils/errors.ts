export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: string[],
  ) {
    super(message);
  }
}

export const badRequest = (errors: string[]) =>
  new AppError(400, 'Parameter tidak valid', errors);
export const unauthorized = () =>
  new AppError(401, 'Token tidak valid atau kadaluwarsa');
export const notFound = (message = 'Dataset tidak ditemukan') =>
  new AppError(404, message);
