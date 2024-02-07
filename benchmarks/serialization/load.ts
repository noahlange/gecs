import { Context } from 'gecs';
import bench from 'nanobench';

import { setup } from '../helpers/serialization';

for (const count of [1, 10, 50, 100]) {
  for (const cmp of [1, 2, 3]) {
    bench(`load ${count}k entities (${cmp} component)`, b => {
      const ctx = setup(count, cmp);
      const saved = ctx.save();
      const ctx2 = new Context();
      ctx2.register(require('../helpers/entities'), require('../helpers/components'), require('../helpers/tags'));

      b.start();
      ctx2.load(saved);
      b.end();
    });
  }
}
