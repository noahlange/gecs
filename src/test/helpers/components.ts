/* eslint-disable max-classes-per-file */

import { Component } from '../../ecs';

export class A extends Component {
  public static readonly type = 'a';
  public value: string = '1';
}

export class B extends Component {
  public static readonly type = 'b';
  public value: number = 1;
}

export class C extends Component {
  public static readonly type = 'c';
  public value: boolean = true;
}
