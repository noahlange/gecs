const { Manager, Context } = require('gecs');
const { E1, E2, E3 } = require('./entities');
const entities = [E1, E2, E3];

const e = Object.values(require('./entities'));
const c = Object.values(require('./components'));

async function setup(create, components) {
  const E = entities[components - 1];
  const ctx = new Context();

  ctx.register(e, c, require('./tags'));

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

  await ctx.tick();
  return ctx;
}

async function setupComplex(create, components) {
  const E = entities[components - 1];

  const ctx = new Context();
  ctx.register(e, c, require('./tags'));
  for (let i = 0; i < create * 1000; i++) {
    ctx.create(
      E,
      {
        test1: { a: 4, b: 5 },
        test2: { c: 6, d: 7 },
        test3: { e: 8, f: 9 }
      },
      ['one', 'two', 'three']
    );
  }
  await ctx.tick();
  return ctx;
}

async function setupTags(create, tags) {
  const tagList = [];
  const ctx = new Context();
  for (let i = 0; i < tags.length; i++) {
    tags.push(`tag-${i + 1}`);
  }
  ctx.register(e, c, require('./tags'));
  for (let i = 0; i < create * 1000; i++) {
    ctx.create(E1, { test1: { a: 4, b: 5 } }, tagList);
  }
  await ctx.tick();
  return ctx;
}

module.exports = {
  setup,
  setupComplex,
  setupTags
};
