const bench = require('nanobench');
const { setupTags } = require('../helpers/queries');

for (const count of [1, 10, 50, 100]) {
  bench(`query ${count}k entities (1 tag)`, async b => {
    const ctx = await setupTags(count, 1);
    b.start();
    ctx.query.tags('tag-1').get();
    b.end();
    await ctx.stop();
  });

  bench(`query ${count}k entities (2 tags)`, async b => {
    const ctx = await setupTags(count, 2);
    b.start();
    ctx.query.tags('tag-1', 'tag-2').get();
    b.end();
    await ctx.stop();
  });

  bench(`query ${count}k entities (3 tags)`, async b => {
    const ctx = await setupTags(count, 3);
    b.start();
    ctx.query.tags('tag-1', 'tag-2', 'tag-3').get();
    b.end();
    await ctx.stop();
  });
}
