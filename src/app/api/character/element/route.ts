import { z } from "zod";
import { action, rpc } from "@/lib/api";
import { ELEMENTS, ELEMENT_CHANGE_GEMS } from "@/lib/game/elements";

// Escolher/trocar o elemento do herói. 1ª escolha grátis; depois custa gemas (preço definido aqui no servidor).
export const POST = action("character-element", z.object({ element: z.enum(ELEMENTS as [string, ...string[]]) }).strict(), async ({ user, body, admin }) => {
  const r = await rpc<{ element: string; paid: number }>(admin, "set_element", { p_user: user.id, p_element: body.element, p_price: ELEMENT_CHANGE_GEMS });
  return { ok: true, ...r };
}, { max: 10, windowSec: 60 });
