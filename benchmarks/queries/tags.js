const bench = require('nanobench');
const { setupTags } = require('../helpers/queries');

for (const count of [1, 10, 50, 100]) {
  bench(`query ${count}k entities (1 tag)`, b => {
    const world = setupTags(count, 1);
    b.start();
    world.query.withTag('tag-1').get();
    b.end();
  });

  bench(`query ${count}k entities (2 tags)`, b => {
    const world = setupTags(count, 2);
    b.start();
    world.query.withTag('tag-1', 'tag-2').get();
    b.end();
  });

  bench(`query ${count}k entities (3 tags)`, b => {
    const world = setupTags(count, 3);
    b.start();
    world.query.withTag('tag-1', 'tag-2', 'tag-3').get();
    b.end();
  });
}
