/* eslint-disable max-classes-per-file */
import { Entity } from '../../ecs';
import { A, B, C } from './components';

// object entities
class WithA extends Entity.with(A) {}
class WithB extends Entity.with(B) {}
class WithC extends Entity.with(C) {}
class WithAB extends Entity.with(A, B) {}
class WithAC extends Entity.with(A, C) {}
class WithABC extends Entity.with(A, B, C) {}

// composed entities
const cWithA = Entity.with(A);
const cWithAB = Entity.with(A, B);
const cWithABC = Entity.with(A, B, C);

export {
  WithA,
  WithB,
  WithC,
  WithAB,
  WithAC,
  WithABC,
  cWithA,
  cWithAB,
  cWithABC
};
