import bench from 'nanobench';

import { setup } from '../helpers/serialization';

for (const count of [1, 10, 50, 100]) {
  for (const cmp of [1, 2, 3]) {
    bench(`save ${count}k entities (${cmp} component)`, b => {
      const ctx = setup(count, cmp);
      b.start();
      ctx.save();
      b.end();
    });
  }
}
