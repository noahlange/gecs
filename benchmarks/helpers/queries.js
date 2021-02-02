const { Manager } = require('../../lib');

function setup(create, E) {
  const em = new Manager();
  for (let i = 0; i < create * 1000; i++) {
    em.create(E, {
      test1: { a: 4, b: 5 },
      test2: { c: 6, d: 7 },
      test3: { e: 8, f: 9 }
    });
  }
  em.cleanup();
  return em;
}

function setupChanged(create, E) {
  const em = setup(create, E);
  const entities = em.query.all();
  for (let i = 0; i < entities.length; i++) {
    const { $$ } = entities[i];
    $$.test1.a = i;
    $$.test2.c = i;
    $$.test3.e = i;
  }
  em.cleanup();
  return em;
}

module.exports = {
  setup,
  setupChanged
};
