const bench = require('nanobench');
const { World } = require('../../lib');
const { setup, register } = require('../helpers/serialization');

for (const count of [1, 10, 50, 100]) {
  for (const cmp of [1, 2, 3]) {
    bench(`load ${count}k entities (${cmp} component)`, b => {
      const world = setup(count, cmp);
      const saved = world.serialize();
      const w2 = new World();
      w2.register(...register);

      b.start();
      w2.deserialize(saved);
      b.end();
    });
  }
}
