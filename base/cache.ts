import { argumentValue, writeIfDiff } from './utils.ts'
import { resolve, fromFileUrl } from 'https://deno.land/std@0.154.0/path/mod.ts';
import download from './download.ts';

function evaluateCacheDir () {
	let r:string|undefined = undefined;
	Deno.args.find((x)=>argumentValue(x, (v)=>r=v, '--cct-cache=', '-cc='))
	if (r) return r;
	r = Deno.env.get('CCT_CACHE');
	if (r) return r;
	r = Deno.env.get('HOME');
	if (r) return resolve(r, '.cct_cache');
	return resolve('./.cct_cache');
}

export const cacheDir = resolve(evaluateCacheDir(), Deno.build.target);
export const cachedKeys = new Map<string,string>();
const pcacheFile_keys = resolve(cacheDir, 'base/keys.json');

function loadCachedKeys () {
	const ctt = ((JSON.parse(Deno.readTextFileSync(pcacheFile_keys))) as string[][]);
	ctt.forEach((x)=>cachedKeys.set(x[0], x[1]));
}
function saveCachedKeys () {
	const ctt = JSON.stringify(
		Array.from(cachedKeys.keys()).map((k)=>([k, cachedKeys.get(k) as string]))
	);
	writeIfDiff(pcacheFile_keys, ctt);
}
try {
	loadCachedKeys();
// deno-lint-ignore no-empty
} catch (_){}
addEventListener("unload", saveCachedKeys);

// automatically download a resource if running through http
export async function getPathResource(x:string):Promise<string> {
	const current_local = import.meta.url;
	if (current_local.indexOf("file://") >= 0)
		return resolve(fromFileUrl(current_local), '../../rsc', x);
	const local_file = resolve(cacheDir, 'rsc', x);
	const url = new URL('../rsc/'+x.replaceAll('\\','/'), current_local);
	await download(url.href, local_file);
	return local_file;
}