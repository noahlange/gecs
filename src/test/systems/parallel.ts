/* eslint-disable max-classes-per-file */
import { describe, expect, test } from '@jest/globals';

import { Context, parallel, sequence, System } from '../../ecs';

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

class SystemB extends System<ContextState> {
  public async tick(): Promise<void> {
    await wait();
    this.ctx.state.value += 1;
  }
}

class SystemC extends System<ContextState> {
  public async tick(): Promise<void> {
    this.ctx.state.value *= 3;
  }
}

class SystemD extends System<ContextState> {
  public async tick(): Promise<void> {
    this.ctx.state.value /= 2;
  }
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
