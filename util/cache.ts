import { path } from '../deps.ts';
import { PA, Platform, hostPA } from './target.ts';
import { unique as kvu } from "./kvfile.ts";
import { homedir } from "./agnosticFS.ts";

/*
FS:
caching:
	{HOME}/.cct_cache/
		kv.json (USER)
		p_{platform}/
			kv.json (user_target_p)
			a_{arch}/
				kv.json (user_target_pa)
	{project(any scope)}/
		build(-{build type})/
		src/
		cache/
*/

const root = (()=>{
	let home = homedir();
	if (home == undefined)
		throw 'cant find HOME path';
	if (hostPA.platform == Platform.MACOS)
		home = path.resolve(home, 'Documents');
	return path.resolve(home,'.cct_cache');
})() as string;
export const cache = (...p:string[])=>path.resolve(root, ...p)
export const cacheP = (pa:PA, ...p:string[])=>path.resolve(root, 'p_'+pa.platform, ...p);
export const cachePA = (pa:PA, ...p:string[])=>path.resolve(root, 'p_'+pa.platform, 'a_'+pa.arch, ...p);

export const kvf = kvu(cache());
export const kvfP = (pa:PA)=>kvu(cacheP(pa));
export const kvfPA = (pa:PA)=>kvu(cachePA(pa));