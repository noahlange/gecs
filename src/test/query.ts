/* eslint-disable max-classes-per-file */

import { test, describe, expect } from '@jest/globals';
import { World, Entity, Component } from '../ecs';

class A extends Component {
  public static readonly type = 'a';
  public text: string = '';
}

class B extends Component {
  public static readonly type = 'b';
  public text: string = '';
}

const MyWorld = World.with();
const WithA = Entity.with(A);
const WithB = Entity.with(B);
const WithAB = Entity.with(A, B);

describe('container queries', () => {
  const myWorld = new MyWorld();

  const count = 5;
  for (let i = 0; i < count; i++) {
    myWorld.entities.create(WithA);
    myWorld.entities.create(WithB);
    myWorld.entities.create(WithAB);
  }

  test('return with() specified containeds', () => {
    const hasA = myWorld.query.with(A).all();
    const hasB = myWorld.query.with(B).all();
    expect(hasA).toHaveLength(count * 2);
    expect(hasB).toHaveLength(count * 2);
  });

  test('return without() specified containers', () => {
    expect(myWorld.query.without(A).all()).toHaveLength(count);
    expect(myWorld.query.without(A, B).all()).toHaveLength(0);
  });

  test('return with()/without() specified containers', () => {
    expect(myWorld.query.with(A).without(B).all()).toHaveLength(count);
  });
});

describe('cached queries', () => {
  test('queries should be purged after a component type modification', () => {
    const world = new MyWorld();
    expect(world.query.with(A, B).all()).toHaveLength(0);
    world.create(WithAB, {});
    expect(world.query.with(A, B).all()).toHaveLength(1);
  });
});

describe('changed()', () => {
  test('changed() should only return modified/added components', () => {
    const world = new MyWorld();
    const entity1 = world.create(WithAB);

    world.create(WithAB);

    expect(world.query.changed(A, B).all()).toHaveLength(2);
    expect(world.query.changed(A, B).all()).toHaveLength(0);

    entity1.$$.a.text = 'changed';
    expect(world.query.changed(A, B).all()).toHaveLength(1);

    entity1.$$.a.text = '123';
    expect(world.query.changed(A, B).first()).toBe(entity1);
  });
});
