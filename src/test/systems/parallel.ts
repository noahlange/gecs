/* eslint-disable max-classes-per-file */
import { describe, expect, test } from '@jest/globals';

import { Context, System } from '../../ecs';
import { parallel, sequence } from '../../ecs/composers';

const wait = (): Promise<void> => new Promise(ok => setTimeout(ok, 10));

interface ContextState {
  value: number;
}

class SystemA extends System<ContextState> {
  public async tick(): Promise<void> {
    this.ctx.state.value += 1;
    await wait();
  }
}

async function SystemB(ctx: Context<ContextState>): Promise<void> {
  await wait();
  ctx.state.value += 1;
}

class SystemC extends System<ContextState> {
  public async tick(): Promise<void> {
    this.ctx.state.value *= 3;
  }
}

async function SystemD(ctx: Context<ContextState>): Promise<void> {
  ctx.state.value /= 2;
}

class MyContext extends Context.with<ContextState>(
  parallel(SystemA, SystemB),
  sequence(SystemC, SystemD)
) {}

describe('parallel systems', () => {
  test('should, by default, execute systems sequentially', async () => {
    const world = new MyContext({ value: 0 });
    await world.start();

    expect(world.state.value).toBe(3);
  });
});
