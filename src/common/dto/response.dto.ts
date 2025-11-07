export class ResponseDto<T> {
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    totalPages: number;
  };
}
