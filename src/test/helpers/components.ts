/* eslint-disable max-classes-per-file */

import type { Entity } from '../../';

import { Component, EntityRef } from '../../';

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

export class D extends Component {
  public static readonly type = 'd';
  public value: (bigint | null)[] = [];
}

export class Ref extends EntityRef<Entity> {
  public static readonly type = 'ref';
}
