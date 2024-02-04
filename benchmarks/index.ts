import type bench from 'nanobench';

import './entities';
import './queries';
import './systems';
// require('./serialization');

export type RunFn = Parameters<typeof bench>[1];
