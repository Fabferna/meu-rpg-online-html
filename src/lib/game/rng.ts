import "server-only";
import { randomInt } from "node:crypto";

// RNG criptográfico do servidor — imprevisível para o cliente.
export const roll = (min: number, max: number) => randomInt(min, max + 1);
export const chance = (p: number) => randomInt(0, 1_000_000) < p * 1_000_000;
