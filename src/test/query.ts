/* eslint-disable max-classes-per-file */
import { test, describe, expect } from '@jest/globals';
import { Contained, Manager } from '../lib';

import { Container } from '../lib/Container';
import { Query } from '../lib/Query';

class A extends Contained {
  public static readonly type = 'a';
}

class B extends Contained {
  public static readonly type = 'b';
}

describe('container queries', () => {
  const em = new Manager();
  const ItemA = Container.with(A);
  const ItemAB = Container.with(A, B);
  const query = new Query(em);

  test('return all containers with matching contained items', () => {
    const count = 5;
    for (let i = 0; i < count; i++) {
      new ItemA(em), new ItemAB(em);
    }
    expect(query.has(A).all().length).toEqual(count * 2);
    expect(query.has(B).all().length).toEqual(count);
  });
});
