const bench = require('nanobench');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { setup } = require('../helpers/queries');

for (const count of [1, 10, 50, 100]) {
  bench(`query ${count}k entities (1 component)`, b => {
    const world = setup(count, 1);
    b.start();
    world.query.components(Test3).get();
    b.end();
  });

  bench(`query ${count}k entities (2 components)`, b => {
    const world = setup(count, 2);
    b.start();
    world.query.components(Test1, Test2).get();
    b.end();
  });

  bench(`query ${count}k entities (3 components)`, b => {
    const world = setup(count, 3);
    b.start();
    world.query.components(Test1, Test2, Test3).get();
    b.end();
  });
}
