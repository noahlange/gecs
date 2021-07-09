const bench = require('nanobench');
const { Context, Component, Entity } = require('../../lib');

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

const Ctx = Context.with(
  ctx => {
    for (const entity of ctx.$.components(Velocity)) {
      entity.$.velocity.dx += 0.01;
      entity.$.velocity.dy -= 0.01;
    }
  },
  ctx => {
    for (const entity of ctx.$.components(Position)) {
      entity.$.position.x += entity.$.velocity.dx;
      entity.$.position.y += entity.$.velocity.dy;
    }
  }
);

function getContext() {
  const ctx = new Ctx();
  ctx.register([Moveable], [Velocity, Position]);
  return ctx;
}

bench(`simple movement, 100 items`, async b => {
  const ctx = getContext();
  await ctx.start();

  for (let x = 0; x < 10 ** 2; x++) {
    ctx.create(Moveable);
  }

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

  b.start();
  for (let i = 0; i < 1000; i++) {
    await ctx.tick();
  }
  b.end();
});
