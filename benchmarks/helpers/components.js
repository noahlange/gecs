const { Component } = require('../../lib');

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

module.exports = { Test1, Test2, Test3 };
