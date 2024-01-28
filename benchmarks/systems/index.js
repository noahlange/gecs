const bench = require('nanobench');
const { Context, Component, Entity, Plugin } = require('gecs');

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

function getTest(count) {
  const Ctx = Context.with(MovePlugin);

  return async b => {
    const ctx = new Ctx();
    await ctx.start();

    // create _n_ entities
    for (let x = 0; x < count; x++) {
      ctx.create(Moveable);
    }
    ctx.manager.tick();

    b.start();
    for (let i = 0; i < 100; i++) {
      await ctx.tick();
    }
    b.end();
  };
}

bench(`100 ticks, 100 entities`, getTest(100));
bench(`100 ticks, 1K entities`, getTest(1000));
bench(`100 ticks, 10K entities`, getTest(10000));
bench(`100 ticks, 100K entities`, getTest(100000));
bench(`100 ticks, 1M entities`, getTest(1000000));
