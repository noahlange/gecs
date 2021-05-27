const bench = require('nanobench');
const { Context } = require('../../lib');
const { setup, register } = require('../helpers/serialization');

for (const count of [1, 10, 50, 100]) {
  for (const cmp of [1, 2, 3]) {
    bench(`load ${count}k entities (${cmp} component)`, b => {
      const ctx = setup(count, cmp);
      const saved = ctx.serialize();
      const ctx2 = new Context();
      ctx2.register(...register);

      b.start();
      ctx2.deserialize(saved);
      b.end();
    });
  }
}
