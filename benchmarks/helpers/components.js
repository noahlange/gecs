const { Component } = require('gecs');

class Test1 extends Component {
  static type = 'test1';
  a = 1;
  b = 2;
}

class Test2 extends Component {
  static type = 'test2';
  c = 3;
  d = 4;
}

class Test3 extends Component {
  static type = 'test3';
  c = 5;
  d = 6;
}

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

module.exports = { Test1, Test2, Test3, Complex1, Complex2, Complex3 };
