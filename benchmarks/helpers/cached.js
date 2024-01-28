const { Context } = require('gecs');
const { E1, E2, E3 } = require('./entities');
const entities = [E1, E2, E3];

function setup(create, components) {
  const E = entities[components - 1];

  const ctx = new Context();
  for (let i = 0; i < create * 1000; i++) {
    const data = { test1: { a: 4, b: 5 } };
    if (components > 1) {
      data.test2 = { c: 6, d: 7 };
    }
    if (components > 2) {
      data.test3 = { e: 8, f: 9 };
    }
    ctx.create(E, data);
  }
  return em;
}
