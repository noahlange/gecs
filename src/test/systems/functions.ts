import { describe, expect, test } from '@jest/globals';

import { Context } from '../../ecs';
import { Plugin } from '../../lib';

class StatelessPlugin extends Plugin<{ state: StatelessPlugin }> {
  public static readonly type = 'state';
  public value = 0;
  public $ = {
    systems: [
      () => {
        this.value += 1;
      },
      () => {
        this.value += 2;
      }
    ]
  };
}

const MyContext = Context.with(StatelessPlugin);

describe('stateless function systems', () => {
  test('should execute properly', async () => {
    const world = new MyContext();
    await world.start();

    expect(world.game.state.value).toBe(3);
  });
});
