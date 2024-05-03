import { describe, expect, test } from 'vitest';

import { Manager } from '../lib';
import { getContext, withTick } from '../test/helpers';
import { A, B, C } from '../test/helpers/components';
import { WithA, WithAB, WithABC } from '../test/helpers/entities';
import { Components, ToIndex } from '../types';
import { Entity } from './Entity';

describe('creating entities', () => {
  const ctx = getContext();

  test('`Entity.with()` adds additional[Components] to the list of those attached to a newly-constructed container', () => {
    const item = ctx.create(WithABC);
    expect(item[Components].length).toBe(3);
  });

  test('Can be created with a static ID.', () => {
    const item = ctx.create(WithABC, { id: 123 });
    expect(item.id).toBe(123);
  });

  test('Create will throw without a global context', () => {
    expect(() => WithABC.create()).toThrow();
  });

  test('The static create() method creates a new entity instance.', () => {
    Entity.ctx = ctx;
    const item = WithABC.create();
    expect(item).toBeInstanceOf(WithABC);
  });
});

describe('populating components', () => {
  test('populating simple components', () => {
    const ctx = getContext();
    const item = ctx.create(WithABC, {
      a: { value: '???' },
      b: { value: 123 },
      c: { value: false }
    });
    expect(item.$.a.value).toEqual('???');
    expect(item.$.b.value).toEqual(123);
    expect(item.$.c.value).toEqual(false);
  });
});

describe('component bindings', () => {
  const ctx = getContext();
  const { $ } = ctx.create(WithABC);

  test('`$` returns all components', () => {
    const keys = Object.keys($);
    expect(keys).toContain(A.type);
    expect(keys).toContain(B.type);
    expect(keys).toContain(C.type);
  });

  test('`$` returns all components', () => {
    const keys = Object.keys($);
    expect(keys).toContain(A.type);
    expect(keys).toContain(B.type);
    expect(keys).toContain(C.type);
  });

  test('`$[type]` returns a component instance of that type', () => {
    expect($[A.type]).toBeInstanceOf(A);
    expect($[B.type]).toBeInstanceOf(B);
    expect($[C.type]).toBeInstanceOf(C);
  });
});

describe('has/is helpers', () => {
  const ctx = getContext();
  const entity = ctx.create(WithAB, {}, ['MY_TAG']);
  test('has() returns true if all components are present', () => {
    expect(entity.has(A, B)).toBeTruthy();
    expect(entity.has(A, C)).toBeFalsy();
  });

  test('is() returns true if all tags are present', () => {
    expect(entity.is('MY_TAG')).toBeTruthy();
    expect(entity.is('OTHER_TAG')).toBeFalsy();
  });
});

describe('modifying components', () => {
  test('removing a component should not affect other entities with the same prototype', () => {
    const ctx = getContext();
    const [a, b] = [ctx.create(WithAB), ctx.create(WithAB)];
    // out of the box, same[Components]
    expect(a[Components]).toEqual(b[Components]);
    a.components.remove(B);
    // a loses a component, b doesn't
    expect(a[Components]).not.toContain(B);
    expect(b[Components]).toContain(B);
  });

  test('adding a component should not affect other entities with the same prototype', () => {
    const ctx = getContext();
    const [a, b] = [ctx.create(WithA), ctx.create(WithA)];
    // out of the box, same[Components]
    expect(a[Components]).toEqual(b[Components]);
    a.components.add(B);
    // a loses a component, b doesn't
    expect(a[Components]).toContain(B);
    expect(b[Components]).not.toContain(B);
  });

  test('adding an duplicate component should be a no-op', async () => {
    const ctx = getContext();
    const a = await withTick(ctx, () => ctx.create(WithA, { a: { value: '2' } }));

    a.components.add(A, { value: '5' });
    expect(a.$.a.value).toBe('2');
    expect(Manager[ToIndex][ctx.manager.id].length).toBe(0);
  });

  test('removing a nonexistent component should be a no-op', async () => {
    const ctx = getContext();
    const a = await withTick(ctx, () => ctx.create(WithA, { a: { value: '2' } }));
    a.components.remove(B);
    expect(Manager[ToIndex][ctx.manager.id].length).toBe(0);
  });

  test('has()', () => {
    const ctx = getContext();
    const a = ctx.create(WithAB);

    expect(a.has(A)).toBe(true);
    expect(a.has(C)).toBe(false);
  });

  test('all(), iterating', () => {
    const ctx = getContext();
    const a = ctx.create(WithAB);

    const all = a.components.all();
    const iterated = Array.from(a.components);

    for (const item of all) {
      expect(iterated).toContain(item);
    }

    for (const item of iterated) {
      expect(all).toContain(item);
    }
  });
});
