import axios from "axios";

/** No reintentar peticiones fallidas por auth — evita ráfagas de 401 en el backend */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return false;
  }
  return failureCount < 2;
}
