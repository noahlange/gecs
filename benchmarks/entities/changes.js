const bench = require('nanobench');
const { Entity, Context } = require('gecs');
const { Test1, Test2, Test3 } = require('../helpers/components');

for (const count of [1, 10, 50, 100]) {
  function setup() {
    const ctx = new Context();
    const TestEntity = Entity.with(Test1, Test2, Test3);
    const entities = [];
    for (let i = 0; i < count * 1000; i++) {
      entities.push(ctx.create(TestEntity));
    }
    ctx.tick();
    return { ctx, entities };
  }

  bench(`Modify ${count}k entities (1 component)`, b => {
    const { entities } = setup();
    b.start();
    for (const { $ } of entities) {
      $.test1.a = 3;
    }
    b.end();
  });

  bench(`Modify ${count}k entities (2 components)`, b => {
    const { entities } = setup();
    b.start();
    for (const { $ } of entities) {
      $.test1.a = 3;
      $.test2.c = 2;
    }
    b.end();
  });

  bench(`Modify ${count}k entities (3 components)`, b => {
    const { entities } = setup();
    b.start();
    for (const { $ } of entities) {
      $.test1.a = 3;
      $.test2.c = 2;
      $.test3.e = 1;
    }
    b.end();
  });
}
