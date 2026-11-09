import { z } from "zod";
import { action, HttpError } from "@/lib/api";
import { pingPresence } from "@/lib/game/counters";

// Batimento do jogo: "estou online". Devolve os contadores para a tela já atualizar junto.
export const POST = action("presence", z.object({}).strict(), async ({ user, admin }) => {
  const c = await pingPresence(admin, user.id);
  if (!c) throw new HttpError(503, "unavailable");
  return c;
}, { max: 6, windowSec: 60 });
