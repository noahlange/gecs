const bench = require('nanobench');
const { Context, Component, Entity, Plugin } = require('../../lib');

class Position extends Component {
  static type = 'position';
  x = 0;
  y = 0;
}

class Velocity extends Component {
  static type = 'velocity';
  dx = 0;
  dy = 0;
}

const Moveable = Entity.with(Velocity, Position);

class MovePlugin extends Plugin {
  static type = 'move';
  $ = {
    entities: [Moveable],
    components: [Velocity, Position],
    systems: [
      ctx => {
        for (const entity of ctx.query.components(Velocity)) {
          entity.$.velocity.dx += 0.01;
          entity.$.velocity.dy -= 0.01;
        }
      },
      ctx => {
        for (const entity of ctx.query.components(Position)) {
          entity.$.position.x += entity.$.velocity.dx;
          entity.$.position.y += entity.$.velocity.dy;
        }
      }
    ]
  };
}

function getContext() {
  const Ctx = Context.with(MovePlugin);
  const ctx = new Ctx();
  return ctx;
}

bench(`simple movement, 100 items`, async b => {
  const ctx = getContext();
  await ctx.start();

  for (let x = 0; x < 10 ** 2; x++) {
    ctx.create(Moveable);
  }
  ctx.manager.tick();

  b.start();
  for (let i = 0; i < 1000; i++) {
    await ctx.tick();
  }
  b.end();
});

bench(`simple movement, 1000 items`, async b => {
  const ctx = getContext();
  await ctx.start();

  for (let x = 0; x < 10 ** 3; x++) {
    ctx.create(Moveable);
  }
  ctx.manager.tick();

  b.start();
  for (let i = 0; i < 1000; i++) {
    await ctx.tick();
  }
  b.end();
});

bench(`simple movement, 10000 items`, async b => {
  const ctx = getContext();
  await ctx.start();

  for (let x = 0; x < 10 ** 4; x++) {
    ctx.create(Moveable);
  }
  ctx.manager.tick();

  b.start();
  for (let i = 0; i < 1000; i++) {
    await ctx.tick();
  }
  b.end();
});
