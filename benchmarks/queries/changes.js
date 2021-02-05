const bench = require('nanobench');
const { Entity } = require('../../lib');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { setupChanged: setup } = require('../helpers/queries');

for (const count of [1, 10, 50, 100]) {
  bench(`query changes in ${count}k entities (1 component)`, b => {
    const em = setup(count, 1);
    b.start();
    em.query.changed(Test3).all();
    b.end();
  });

  bench(`query changes in ${count}k entities (2 components)`, b => {
    const em = setup(count, 2);
    b.start();
    em.query.changed(Test1, Test2).all();
    b.end();
  });

  bench(`query changes in ${count}k entities (3 components)`, b => {
    const em = setup(count, 3);
    b.start();
    em.query.changed(Test1, Test2, Test3).all();
    b.end();
  });
}
