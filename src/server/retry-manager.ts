type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  factor?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

export class RetryManager {
  static async execute<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T> {
    const retries = options?.retries ?? 2;
    const baseDelayMs = options?.baseDelayMs ?? 500;
    const factor = options?.factor ?? 2;
    const shouldRetry = options?.shouldRetry ?? (() => true);

    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error) {
        if (attempt >= retries || !shouldRetry(error, attempt + 1)) {
          throw error;
        }

        attempt += 1;
        const delayMs = baseDelayMs * Math.pow(factor, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}
