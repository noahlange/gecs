/* eslint-disable max-classes-per-file */
import { Entity } from '../../ecs';
import { A, B, C } from './components';

class WithA extends Entity.with(A) {
  public text: string = '1';
}

class WithB extends Entity.with(B) {}

class WithAB extends Entity.with(A, B) {}

class WithABC extends Entity.with(A, B, C) {}

export { WithA, WithB, WithAB, WithABC };
