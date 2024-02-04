/* eslint-disable max-classes-per-file */
import { Component } from 'gecs';

class Test1 extends Component {
  public static readonly type = 'test1';
  public a = 1;
  public b = 2;
}

class Test2 extends Component {
  public static readonly type = 'test2';
  public c = 3;
  public d = 4;
}

class Test3 extends Component {
  public static readonly type = 'test3';
  public e = 5;
  public f = 6;
}

class Complex1 extends Component {
  public static readonly type = 'complex1';
  public data = { a: { b: { c: 2 } } };
}

class Complex2 extends Component {
  public static readonly type = 'complex2';
  public data = { d: { e: [{ f: 'g' }] } };
}

class Complex3 extends Component {
  public static readonly type = 'complex3';
  public data = { foo: {}, bar: [{ bar: 'baz' }] };
}

export { Test1, Test2, Test3, Complex1, Complex2, Complex3 };

export default [Test1, Test2, Test3, Complex1, Complex2, Complex3];
