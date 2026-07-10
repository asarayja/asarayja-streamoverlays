import { customAlphabet, nanoid } from "nanoid";

export const uid = (): string => nanoid(12);

/** Unambiguous uppercase code for OBS URLs — no O/0, no I/1. */
const obsAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export const obsCode = (): string => obsAlphabet();
