/* eslint-disable max-classes-per-file */
import type { RunFn } from '../';
import type { PluginData } from 'gecs';

import { Component, Context, Entity, Plugin } from 'gecs';
import bench from 'nanobench';

class Position extends Component {
  public static readonly type = 'position';
  public x = 0;
  public y = 0;
}

class Velocity extends Component {
  public static readonly type = 'velocity';
  public dx = 0;
  public dy = 0;
}

const Moveable = Entity.with(Velocity, Position);

class MovePlugin extends Plugin {
  public static readonly type = 'move';
  public $: PluginData<{}> = {
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
        for (const entity of ctx.query.components(Position, Velocity)) {
          entity.$.position.x += entity.$.velocity.dx;
          entity.$.position.y += entity.$.velocity.dy;
        }
      }
    ]
  };
}

function getTest(count: number): RunFn {
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

bench(`100 ticks, 100 entities `, getTest(100));
bench(`100 ticks, 1K entities  `, getTest(1_000));
bench(`100 ticks, 10K entities `, getTest(10_000));
bench(`100 ticks, 100K entities`, getTest(100_000));
bench(`100 ticks, 1M entities  `, getTest(1_000_000));
