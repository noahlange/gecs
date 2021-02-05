const { Entity } = require('../../lib');
const { Test1, Test2, Test3 } = require('./components');

const E3 = Entity.with(Test1, Test2, Test3);
const E2 = Entity.with(Test1, Test2);
const E1 = Entity.with(Test1);

module.exports = { E1, E2, E3 };
