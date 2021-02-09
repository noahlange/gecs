import { test, describe, expect, jest } from '@jest/globals';

import { World } from '../ecs';
import { SystemA, SystemB, SystemC } from './helpers/systems';

describe('world initialization', () => {
  test('`start()` should return a promise', async () => {
    const WorldB = World.with(SystemB);
    const world = new WorldB();
    await expect(world.start()).resolves.not.toThrow();
    expect(world.$.b.booted).toBeTruthy();
  });

  test('`world.init()` should instantiate systems in order of registration', async () => {
    const spy = jest
      .spyOn(globalThis.console, 'log')
      .mockImplementation(() => {});

    const WorldABC = World.with(SystemA, SystemB, SystemC);
    const worldABC = new WorldABC();
    await worldABC.start();

    expect(console.log).toHaveBeenNthCalledWith(1, SystemA.type);
    expect(console.log).toHaveBeenNthCalledWith(2, SystemB.type);
    expect(console.log).toHaveBeenNthCalledWith(3, SystemC.type);

    const WorldCAB = World.with(SystemC, SystemA, SystemB);
    const worldCAB = new WorldCAB();
    await worldCAB.start();

    expect(console.log).toHaveBeenNthCalledWith(4, SystemC.type);
    expect(console.log).toHaveBeenNthCalledWith(5, SystemA.type);
    expect(console.log).toHaveBeenNthCalledWith(6, SystemB.type);

    spy.mockRestore();
  });
});
