import type { Identifier } from '../types';

export interface IdentifierGenerator {
  (): Identifier;
}

const released: Identifier[] = [];
const reserved: Set<Identifier> = new Set();

function* intGenerator(): IterableIterator<number> {
  let id = 1;
  do {
    yield id++;
  } while (true);
}

export const intID = (): (() => number) => {
  const gen = intGenerator();
  return (): number => released.shift() ?? gen.next().value;
};

export const releaseID = (id: Identifier): void => {
  if (reserved.has(id)) {
    reserved.delete(id);
  }
  released.push(id);
};

export const reserveID = (id: Identifier): void => {
  reserved.add(id);
};

const generator: Record<string, IdentifierGenerator> = {
  fn: intID()
};

/**
 * Set the string ID generation function.
 */
export function setID(fn: IdentifierGenerator): void {
  generator.fn = fn;
}

/**
 * Return a new string ID.
 */
export function getID(): Identifier {
  return generator.fn();
}

/**
 * Return bigints increasing by powers of 2.
 * 0001 -> 0010 -> 0100 -> 1000, etc.
 */
function* bigintIDGenerator(): IterableIterator<bigint> {
  let id = 1n;
  do {
    yield 1n << id++;
  } while (true);
}

/**
 * Return a new bigint generation function.
 */
export const bigintID = (): (() => bigint) => {
  const gen = bigintIDGenerator();
  return (): bigint => gen.next().value;
};

export const ids = {
  release: releaseID,
  reserve: reserveID,
  set: setID,
  get: getID
};
