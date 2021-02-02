const bench = require('nanobench');
const { Entity } = require('../../lib');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { setup } = require('../helpers/queries');

for (const count of [1, 10, 50, 100]) {
  const e = Entity.with(Test1, Test2, Test3);

  bench(`query ${count}k entities (1 component)`, b => {
    const world = setup(count, e);
    b.start();
    world.query.with(Test3).all();
    b.end();
  });

  bench(`query ${count}k entities (2 components)`, b => {
    const world = setup(count, e);
    b.start();
    world.query.with(Test1, Test2).all();
    b.end();
  });

  bench(`query ${count}k entities (3 components)`, b => {
    const world = setup(count, e);
    b.start();
    world.query.with(Test1, Test2, Test3).all();
    b.end();
  });
}
