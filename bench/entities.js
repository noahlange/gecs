const bench = require('nanobench');

const { Test1, Test2, Test3 } = require('./helpers');
const { Entity, World } = require('../lib');

for (const count of [1, 10, 50, 100]) {
  bench(`Create ${count}k entities (1 component)`, b => {
    const world = new World();
    const E2 = Entity.with(Test1);
    b.start();
    for (let i = 0; i < count * 1000; i++) {
      world.create(E2, { a: 4, b: 5 });
    }
    b.end();
  });

  bench(`Create ${count}k entities (2 components)`, b => {
    const world = new World();
    const E1 = Entity.with(Test1, Test2);
    b.start();
    for (let i = 0; i < count * 1000; i++) {
      world.create(E1, { test1: { a: 4, b: 5 }, test2: { c: 6, d: 7 } });
    }
    b.end();
  });

  bench(`Create ${count}k entities (3 components)`, b => {
    const world = new World();
    const E3 = Entity.with(Test1, Test2, Test3);

    b.start();
    for (let i = 0; i < count * 1000; i++) {
      world.create(E3, {
        test1: { a: 4, b: 5 },
        test2: { c: 6, d: 7 },
        test3: { e: 8, f: 9 }
      });
    }
    b.end();
  });
}

for (const count of [1, 10, 50, 100]) {
  function setup() {
    const TestEntity = Entity.with(Test1, Test2, Test3);
    const world = new World();
    const entities = [];
    for (let i = 0; i < count * 1000; i++) {
      entities.push(world.create(TestEntity));
    }
    return entities;
  }

  bench(`Modify ${count}k entities (1 component)`, b => {
    const entities = setup();
    b.start();
    for (const item of entities) {
      item.$$.test1.a = 3;
    }
    b.end();
  });

  bench(`Modify ${count}k entities (2 components)`, b => {
    const entities = setup();
    b.start();
    for (const item of entities) {
      item.$$.test1.a = 3;
      item.$$.test2.c = 2;
    }
    b.end();
  });

  bench(`Modify ${count}k entities (3 components)`, b => {
    const entities = setup();
    b.start();
    for (const item of entities) {
      item.$$.test1.a = 3;
      item.$$.test2.c = 2;
      item.$$.test3.e = 1;
    }
    b.end();
  });
}
