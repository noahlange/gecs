/* eslint-disable max-classes-per-file */
import { Entity } from '../../ecs';
import { A, B, C, Ref } from './components';

// object entities
class WithA extends Entity.with(A) {}
class WithB extends Entity.with(B) {}
class WithC extends Entity.with(C) {}
class WithAB extends Entity.with(A, B) {}
class WithAC extends Entity.with(A, C) {}
class WithABC extends Entity.with(A, B, C) {}
class WithRef extends Entity.with(Ref) {}

// composed entities
const cWithA = Entity.with(A);
const cWithAB = Entity.with(A, B);
const cWithABC = Entity.with(A, B, C);
const cWithRef = Entity.with(Ref);

export {
  WithA,
  WithB,
  WithC,
  WithAB,
  WithAC,
  WithABC,
  WithRef,
  cWithA,
  cWithAB,
  cWithABC,
  cWithRef
};
