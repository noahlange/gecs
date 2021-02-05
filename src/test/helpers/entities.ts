/* eslint-disable max-classes-per-file */
import { Entity } from '../../ecs';
import { A, B, C } from './components';

// object entities
class WithA extends Entity.with(A) {
  public text: string = '1';
}
class WithB extends Entity.with(B) {}
class WithC extends Entity.with(C) {}
class WithAB extends Entity.with(A, B) {}
class WithABC extends Entity.with(A, B, C) {}

// composed entities
const cWithA = Entity.with(A);
const cWithAB = Entity.with(A, B);
const cWithABC = Entity.with(A, B, C);

export { WithA, WithB, WithC, WithAB, WithABC, cWithA, cWithAB, cWithABC };
