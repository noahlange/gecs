/* eslint-disable max-classes-per-file */
import { Entity } from '../../';
import { A, B, C, D, Ref } from './components';

// object entities
class WithA extends Entity.with(A) {}
class WithB extends Entity.with(B) {}
class WithC extends Entity.with(C) {}
class WithAB extends Entity.with(A, B) {}
class WithAC extends Entity.with(A, C) {}
class WithABC extends Entity.with(A, B, C) {}
class WithRef extends Entity.with(Ref) {}
class WithD extends Entity.with(D) {}

// composed entities
const cWithA = Entity.with(A);
const cWithAB = Entity.with(A, B);
const cWithABC = Entity.with(A, B, C);
const cWithRef = Entity.with(Ref);

export { WithA, WithB, WithC, WithAB, WithAC, WithABC, WithD, WithRef, cWithA, cWithAB, cWithABC, cWithRef };
