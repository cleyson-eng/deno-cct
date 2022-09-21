import { Run } from './base/interfaces.ts';
import { exit } from './base/exit.ts';
import "./tcf/_.ts";

const v = Array.from(Deno.args);
exit((await Run(v, 0)).code);