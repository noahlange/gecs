/* eslint-disable max-classes-per-file */

import { test, describe, expect, jest } from '@jest/globals';
import { Contained } from '../lib';

import { A, B } from './helpers/containeds';
import { MyWorld, WithA, WithB, WithAB } from './helpers/containers';

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

describe('first()', () => {
  const myWorld = new MyWorld();
  const a = myWorld.entities.create(WithA);

  myWorld.entities.create(WithB);
  myWorld.entities.create(WithAB);

  test('first() should return a single entity', () => {
    expect(myWorld.query.with(A).first()).toBe(a);
  });
});

describe('find()/findIn()', () => {
  const myWorld = new MyWorld();
  const a = myWorld.entities.create(WithA);
  const b = myWorld.entities.create(WithB);
  const ab = myWorld.entities.create(WithAB);

  test('find() should return a single entity by id', () => {
    expect(myWorld.query.with(A).find(a.id)).toBe(a);
  });

  test('find() should return null if no match is found', () => {
    expect(myWorld.query.with(A).find(b.id)).toBeNull();
  });

  test('findIn() should return an array of entries', () => {
    const res = myWorld.query.with(B).findIn([a.id, ab.id]);
    expect(res).toHaveLength(1);
    expect(res.includes(ab)).toBeTruthy();
  });
});

describe('warnings', () => {
  const myWorld = new MyWorld();

  test('should warn about unnamed components', () => {
    const spy = jest
      .spyOn(globalThis.console, 'warn')
      .mockImplementation(() => {});

    myWorld.query.with(Contained);
    expect(console.warn).toHaveBeenCalled();

    spy.mockRestore();
  });
});

describe('changed()/unchanged()', () => {
  test('changed() should return newly-created entities', () => {
    const world = new MyWorld();
    const entity1 = world.create(WithAB);
    const res = world.query.changed(A, B).first();
    expect(res).toEqual(entity1);
  });

  test('changed() should return modified entities', () => {
    const world = new MyWorld();
    const entity1 = world.create(WithAB);
    const entity2 = world.create(WithAB);

    world.query.changed(A, B).all(); // 2
    world.query.changed(A, B).all(); // 0

    entity1.$$.a.value = '123';
    expect(world.query.changed(A, B).first()).toBe(entity1);
  });

  test('a changed() component is marked unchanged after being queried and returned', () => {
    const world = new MyWorld();
    world.create(WithAB);
    world.query.changed(A, B).all(); // 1
    expect(world.query.changed(A, B).all()).toHaveLength(0);
  });

  test('unchanged() should return unmodified entries', () => {
    const world = new MyWorld();
    const entity1 = world.create(WithAB);
    const entity2 = world.create(WithAB);

    world.query.changed(A, B).all(); // 2
    entity1.$$.b.value = 2;

    expect(world.query.unchanged(A, B).first()).toEqual(entity2);
  });
});
