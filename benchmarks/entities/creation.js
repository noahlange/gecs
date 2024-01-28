const bench = require('nanobench');
const { Test1, Test2, Test3 } = require('../helpers/components');
const { Entity, Context } = require('gecs');

for (const count of [1, 10, 50, 100]) {
  bench(`Create ${count}k entities (1 component)`, b => {
    const ctx = new Context();
    const E2 = Entity.with(Test1);
    b.start();
    for (let i = 0; i < count * 1000; i++) {
      ctx.create(E2, { a: 4, b: 5 });
    }
    b.end();
  });

  bench(`Create ${count}k entities (2 components)`, b => {
    const ctx = new Context();
    const E1 = Entity.with(Test1, Test2);
    b.start();
    for (let i = 0; i < count * 1000; i++) {
      ctx.create(E1, { test1: { a: 4, b: 5 }, test2: { c: 6, d: 7 } });
    }
    b.end();
  });

  bench(`Create ${count}k entities (3 components)`, b => {
    const ctx = new Context();
    const E3 = Entity.with(Test1, Test2, Test3);

    b.start();
    for (let i = 0; i < count * 1000; i++) {
      ctx.create(E3, {
        test1: { a: 4, b: 5 },
        test2: { c: 6, d: 7 },
        test3: { e: 8, f: 9 }
      });
    }
    b.end();
  });
}
