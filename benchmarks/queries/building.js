const bench = require('nanobench');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { E1, E2, E3 } = require('../helpers/entities');
const { setupComplex } = require('../helpers/queries');

const ctx = setupComplex(10, 1);

const components = [Test1, Test2, Test3];
const entities = [E1, E2, E3];
const tags = ['one', 'two', 'three'];

for (let count = 1; count <= 3; count++) {
  const c = components.slice(0, count);
  const e = entities.slice(0, count);
  const t = tags.slice(0, count);

  bench(`building 1 step query - ${count} items`, b => {
    b.start();
    ctx.$.all.components(...c).query;
    b.end();
  });

  bench(`building 2 step query - ${count} items`, b => {
    b.start();
    ctx.$.all.components(...c).all.entities(...e).query;
    b.end();
  });

  bench(`building 3 step query - ${count} items`, b => {
    b.start();
    ctx.$.all
      .components(...c)
      .all.entities(...e)
      .all.tags(...t).query;
    b.end();
  });
}
