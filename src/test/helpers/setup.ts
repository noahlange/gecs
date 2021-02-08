import { ContainerManager as Manager } from '../../managers';
import { WithA, WithAC, WithABC, WithB } from './entities';

export function setup(): { em: Manager; ids: string[] } {
  const em = new Manager();
  const ids: string[] = [];
  const count = 5;

  for (let i = 0; i < count; i++) {
    const a = em.create(WithA, {}, ['a']);
    const b = em.create(WithB, {}, ['b']);
    const c = em.create(WithAC, {}, ['a', 'b']);
    const d = em.create(WithABC, {}, ['a', 'b', 'c']);
    ids.push(a.id, b.id, c.id, d.id);
  }
  return { em, ids };
}
