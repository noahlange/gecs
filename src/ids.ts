import { nanoid } from 'nanoid/non-secure';

export interface IdentifierGenerator {
  (): string;
}

let gen: IdentifierGenerator = (): string => nanoid();

/**
 * Set the string ID generation function.
 */
export function setID(fn: IdentifierGenerator): void {
  gen = fn;
}

/**
 * Return a new string ID.
 */
export function getID(): string {
  return gen();
}

/**
 * Return bigints increasing by powers of 2.
 * 0001 -> 0010 -> 0100 -> 1000, etc.
 */
function* idGenerator(): IterableIterator<bigint> {
  let id = 1n;
  do {
    yield 1n << id++;
  } while (true);
}

/**
 * Return a new bigint generation function.
 */
export const intID = (): (() => bigint) => {
  const gen = idGenerator();
  return (): bigint => gen.next().value;
};
