import { World, Entity } from '../../ecs';
import { A, B, C } from './containeds';

const MyWorld = World.with();

class WithA extends Entity.with(A) {
  public text: string = '1';
}
const WithB = Entity.with(B);
const WithAB = Entity.with(A, B);
const WithABC = Entity.with(A, B, C);

export { MyWorld, WithA, WithB, WithAB, WithABC };
