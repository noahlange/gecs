import { nanoid } from 'nanoid/non-secure';
import type { QueryType } from '../types';

export class Registry {
  protected registry: Record<string, string> = {};
  protected type: QueryType;
  protected pass: boolean = false;

  public register(keys: string[]): string[] {
    const res: string[] = [];
    for (const key of keys) {
      if (!(key in this.registry)) {
        this.registry[key] = this.pass ? key : nanoid(8);
      }
      res.push(this.registry[key]);
    }
    return res;
  }

  public getID(key: string): string {
    return this.registry[key];
  }

  public constructor(type: QueryType, pass: boolean = false) {
    this.type = type;
    this.pass = pass;
  }
}
