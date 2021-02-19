import { EntityManager } from './managers';
import { A } from './test/helpers/components';
import { aWithA, WithA } from './test/helpers/entities';

const em = new EntityManager();
em.create(WithA, { a: { value: '123' } });
em.create(aWithA, { a: [{ value: '123' }] });

console.log(em.query.all.components([A]).get());
console.log(em.query.all.components(A).get());
