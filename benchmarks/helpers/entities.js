const { Entity } = require('gecs');
const { Test1, Test2, Test3 } = require('./components');

const E1 = Entity.with(Test1);
const E2 = Entity.with(Test2);
const E3 = Entity.with(Test3);
const E12 = Entity.with(Test1, Test2);
const E123 = Entity.with(Test1, Test2, Test3);
const E13 = Entity.with(Test1, Test3);
const E23 = Entity.with(Test2, Test3);

module.exports = { E1, E2, E3, E12, E13, E123, E13, E23 };
