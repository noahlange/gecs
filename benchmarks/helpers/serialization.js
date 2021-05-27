const { Context, Entity, Component } = require('../../lib');

class Complex1 extends Component {
  static type = 'complex1';
  data = { a: { b: { c: 2 } } };
}
class Complex2 extends Component {
  static type = 'complex2';
  data = { d: { e: [{ f: 'g' }] } };
}
class Complex3 extends Component {
  static type = 'complex3';
  data = { foo: {}, bar: [{ bar: 'baz' }] };
}

const E1 = Entity.with(Complex1);
const E2 = Entity.with(Complex1, Complex2);
const E3 = Entity.with(Complex1, Complex2, Complex3);

const register = [Complex1, Complex2, Complex3, E1, E2, E3];
const entities = [E1, E2, E3];

function setup(create, components) {
  const E = entities[components - 1];
  const ctx = new Context();
  ctx.register(...register);

  for (let i = 0; i < create * 1000; i++) {
    const data = { complex1: { a: { b: { c: 5 } } } };
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

module.exports = {
  setup,
  register
};
