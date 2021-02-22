const { Manager } = require('../../lib');
const { E1, E2, E3 } = require('./entities');
const entities = [E1, E2, E3];

function setup(create, components) {
  const E = entities[components - 1];

  const em = new Manager();
  for (let i = 0; i < create * 1000; i++) {
    const data = { test1: { a: 4, b: 5 } };
    if (components > 1) {
      data.test2 = { c: 6, d: 7 };
    }
    if (components > 2) {
      data.test3 = { e: 8, f: 9 };
    }
    em.create(E, data);
  }
  em.tick();
  return em;
}

function setupComplex(create, components) {
  const E = entities[components - 1];

  const em = new Manager();
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

function setupTags(create, tags) {
  const tagList = [];
  for (let i = 0; i < tags.length; i++) {
    tags.push(`tag-${i + 1}`);
  }
  const em = new Manager();
  for (let i = 0; i < create * 1000; i++) {
    em.create(E1, { test1: { a: 4, b: 5 } }, tagList);
  }
  em.tick();
  return em;
}

module.exports = {
  setup,
  setupComplex,
  setupTags
};
