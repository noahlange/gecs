import { Container } from '../../lib';
import { A, B, C } from './containeds';

export const Item = Container.with(A, B, C);
