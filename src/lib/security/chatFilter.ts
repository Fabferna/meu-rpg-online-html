// Filtro simples de linguagem ofensiva e de spam para o chat.
// Amplie a lista conforme a comunidade crescer.
const BLOCKED = [
  "porra", "caralho", "puta", "puto", "viado", "vadia", "arrombado", "fdp", "filho da puta", "buceta", "cuzao", "cuzão",
  "merda", "otario", "otário", "desgraçado", "desgracado", "retardado", "macaco", "nazista",
  "fuck", "shit", "bitch", "nigger", "faggot", "cunt",
];

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[@4]/g, "a").replace(/3/g, "e").replace(/[1!]/g, "i").replace(/0/g, "o").replace(/\$/g, "s");

export function cleanMessage(raw: string): { ok: true; text: string } | { ok: false; reason: string } {
  let text = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > 300) text = text.slice(0, 300);
  // Links não são permitidos (golpes/phishing).
  if (/(https?:\/\/|www\.|\.(com|net|org|br|gg|io)\b)/i.test(text)) return { ok: false, reason: "links" };
  // Letras repetidas demais / CAIXA ALTA demais.
  text = text.replace(/(.)\1{5,}/g, "$1$1$1");
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length > 12 && letters === letters.toUpperCase()) text = text.toLowerCase();
  // Censura palavras bloqueadas com ***.
  const norm = normalize(text);
  for (const w of BLOCKED) {
    const nw = normalize(w);
    let idx = norm.indexOf(nw);
    while (idx !== -1) {
      // Só censura palavra inteira ("computador" não contém palavrão).
      const before = norm[idx - 1] ?? " ", after = norm[idx + nw.length] ?? " ";
      if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) {
        text = text.slice(0, idx) + "*".repeat(nw.length) + text.slice(idx + nw.length);
      }
      idx = norm.indexOf(nw, idx + nw.length);
    }
  }
  return { ok: true, text };
}
