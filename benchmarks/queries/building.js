const bench = require('nanobench');
const { Manager } = require('../../lib/lib');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { E1, E2, E3 } = require('../helpers/entities');

const components = [Test1, Test2, Test3];
const entities = [E1, E2, E3];
const tags = ['one', 'two', 'three'];

function setupComplex(create, i) {
  const E = entities[i - 1];

  const em = new Manager();
  em.register(entities, components, tags);

  for (let i = 0; i < create * 1000; i++) {
    em.create(
      E,
      {
        test1: { a: 4, b: 5 },
        test2: { c: 6, d: 7 },
        test3: { e: 8, f: 9 }
      },
      ['one', 'two', 'three']
    );
  }
  em.tick();
  return em;
}

const em = setupComplex(10, 1);

for (let count = 1; count <= 3; count++) {
  const c = components.slice(0, count);
  const t = tags.slice(0, count);

  bench(`building 1 step query - ${count} items`, b => {
    b.start();
    em.$.components(...c).query;
    b.end();
  });

  bench(`building 2 step query - ${count} items`, b => {
    b.start();
    em.$.components(...c).tags(...t).query;
    b.end();
  });
}
