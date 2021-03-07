import type { Compressed } from 'compress-json';
import { describe, test, expect } from '@jest/globals';
import { World } from '../ecs';

import * as E from './helpers/entities';
import * as C from './helpers/components';

function setup(): World {
  const world = new World();
  world.register(C.A, C.B, C.C, C.Ref);
  // named entities
  world.register(E.WithA, E.WithAB, E.WithABC, E.WithRef);
  // anonymous entities
  world.register(E.cWithA, E.cWithAB, E.cWithABC, E.cWithRef);
  return world;
}

describe('serialize and deserialize', () => {
  test("basics: doesn't explode", () => {
    const world = setup();
    for (let i = 0; i < 5; i++) {
      world.create(E.WithA);
      world.create(E.cWithAB);
      world.create(E.WithRef);
    }

    let res: Compressed;

    expect(() => (res = world.serialize())).not.toThrow();
    expect(() => world.deserialize(res)).not.toThrow();
  });

  test('serializes anonymous entities', () => {
    const [world1, world2] = [setup(), setup()];
    for (let i = 0; i < 5; i++) {
      world1.create(E.cWithAB);
    }
    const saved = world1.serialize();

    world2.deserialize(saved);
    world2.tick(0, 0);

    expect(Array.from(world2.query.components(C.A, C.B))).toHaveLength(5);
    for (const entity of world2.query.components(C.A, C.B)) {
      expect(entity).toBeInstanceOf(E.cWithAB);
    }
  });

  test('idempotent serializations', () => {
    const [world1, world2] = [setup(), setup()];
    for (let i = 0; i < 5; i++) {
      world1.create(E.cWithAB);
    }

    const save1 = world1.serialize();
    world2.deserialize(save1);
    const save2 = world2.serialize();

    expect(save1).toEqual(save2);
  });

  test('reattaches entity instances', () => {
    const [world1, world2] = [setup(), setup()];
    for (let i = 0; i < 5; i++) {
      const e = world1.create(E.WithRef);
      e.$.ref.value = e;
    }

    const saved = world1.serialize();

    world2.deserialize(saved);
    world2.tick(0, 0);

    for (const entity of world2.query.components(C.Ref)) {
      expect(entity.$.ref.value).toBe(entity);
    }
  });
});
