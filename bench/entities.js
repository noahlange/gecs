/* eslint-disable max-classes-per-file */

const bench = require('nanobench');
const { Component, Entity, World } = require('../lib');

class Test extends Component {
  static type = 'test1';
  a = 1;
  b = 2;
}

class Test2 extends Component {
  static type = 'test2';
  c = 3;
  d = 4;
}

class Test3 extends Component {
  static type = 'test2';
  c = 5;
  d = 6;
}

for (const count of [1, 10, 50, 100]) {
  bench(`Create ${count}k entities (1 component)`, b => {
    const world = new World();
    const E2 = Entity.with(Test);
    b.start();
    for (let i = 0; i < count * 1000; i++) {
      world.create(E2, { a: 4, b: 5 });
    }
    b.end();
  });

  bench(`Create ${count}k entities (2 components)`, b => {
    const world = new World();
    const E1 = Entity.with(Test, Test2);
    b.start();
    for (let i = 0; i < count * 1000; i++) {
      world.create(E1, { test1: { a: 4, b: 5 }, test2: { c: 6, d: 7 } });
    }
    b.end();
  });

  bench(`Create ${count}k entities (3 components)`, b => {
    const world = new World();
    const E3 = Entity.with(Test, Test2, Test3);

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
