import { Context, Entity, EntityClass } from 'gecs';

import { Complex1, Complex2, Complex3 } from './components';
import c from './components';
import e from './entities';
import t from './tags';

const E1 = Entity.with(Complex1);
const E2 = Entity.with(Complex1, Complex2);
const E3 = Entity.with(Complex1, Complex2, Complex3);

const entities = [E1, E2, E3];

function setup(create: number, components: number) {
  const E = entities[components - 1] as EntityClass;
  const ctx = new Context();
  ctx.register(e, c, t);

  for (let i = 0; i < create * 1000; i++) {
    const data: any = { complex1: { a: { b: { c: 5 } } } };
    if (components > 1) {
      data.complex2 = { d: { e: [{ f: 123 }] } };
    }
    if (components > 2) {
      data.test3 = {
        foo: {},
        bar: [{ bar: 'asdf' }, { bar: 'asdf' }, { bar: 'asdf' }]
      };
    }
    ctx.create(E, data);
  }
  ctx.manager.tick();
  return ctx;
}

export { setup };
