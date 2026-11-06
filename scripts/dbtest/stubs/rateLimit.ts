// Nos testes não há limite de requisições.
export async function rateLimit(..._args: unknown[]) { return true; }
