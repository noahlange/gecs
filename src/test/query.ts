/* eslint-disable max-classes-per-file */
import { test, describe, expect } from '@jest/globals';
import { World, Entity, Component } from '../ecs';

class A extends Component {
  public static readonly type = 'a';
}

class B extends Component {
  public static readonly type = 'b';
}

const MyWorld = World.with();
const WithA = Entity.with(A);
const WithAB = Entity.with(A, B);

describe('container queries', () => {
  const myWorld = new MyWorld();

  test('return all containers with matching contained items', () => {
    const count = 5;
    for (let i = 0; i < count; i++) {
      myWorld.entities.create(WithA);
      myWorld.entities.create(WithAB);
    }
    expect(myWorld.query(A).all().length).toEqual(count * 2);
    expect(myWorld.query(B).all().length).toEqual(count);
  });
});
