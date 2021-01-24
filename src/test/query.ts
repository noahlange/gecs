/* eslint-disable max-classes-per-file */
import { test, describe, expect } from '@jest/globals';
import { World, Entity, Component } from '../ecs';

class A extends Component {
  public static readonly type = 'a';
}

class B extends Component {
  public static readonly type = 'b';
}

describe('container queries', () => {
  const MyWorld = World.with();
  const WithA = Entity.with(A);
  const WithB = Entity.with(B);
  const WithAB = Entity.with(A, B);

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
