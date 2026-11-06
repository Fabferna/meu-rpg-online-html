/**
 * Evita open-redirect: só aceita caminhos internos simples.
 * Recusa "//host", "/\host" e caracteres de controle (tab, quebra de linha),
 * que o parser de URL remove e transformam "/\t/evil.com" em "//evil.com".
 * Pode ser usado no servidor e no navegador.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/jogo"): string {
  if (!next || next.length > 512) return fallback;
  if (!/^\/(?![/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/.test(next)) return fallback;
  if (/%(0[0-9a-f]|1[0-9a-f]|5c|7f)/i.test(next)) return fallback; // controle/"\" codificados
  return next;
}
