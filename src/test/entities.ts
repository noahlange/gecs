import { describe, expect, test } from '@jest/globals';

import { A, B, C } from './helpers/components';
import { WithA, WithAB, WithABC } from './helpers/entities';
import { getContext } from './helpers/setup';
import { withTick } from './helpers/utils';

describe('creating entities', () => {
  const ctx = getContext();
  const item = ctx.create(WithABC);

  test('`Entity.with()` adds additional items to the list of those attached to a newly-constructed container', () => {
    expect(item.items.length).toBe(3);
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
    // out of the box, same items
    expect(a.items).toEqual(b.items);
    a.components.remove(B);
    // a loses a component, b doesn't
    expect(a.items).not.toContain(B);
    expect(b.items).toContain(B);
  });

  test('adding a component should not affect other entities with the same prototype', () => {
    const ctx = getContext();
    const [a, b] = [ctx.create(WithA), ctx.create(WithA)];
    // out of the box, same items
    expect(a.items).toEqual(b.items);
    a.components.add(B);
    // a loses a component, b doesn't
    expect(a.items).toContain(B);
    expect(b.items).not.toContain(B);
  });

  test('adding an duplicate component should be a no-op', async () => {
    const ctx = getContext();
    const a = await withTick(ctx, () =>
      ctx.create(WithA, { a: { value: '2' } })
    );

    a.components.add(A, { value: '5' });
    expect(a.$.a.value).toBe('2');
    // @ts-expect-error
    expect(ctx.manager.toIndex.size).toBe(0);
  });

  test('removing a nonexistent component should be a no-op', async () => {
    const ctx = getContext();
    const a = await withTick(ctx, () =>
      ctx.create(WithA, { a: { value: '2' } })
    );
    a.components.remove(B);
    // @ts-expect-error
    expect(ctx.manager.toIndex.size).toBe(0);
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
