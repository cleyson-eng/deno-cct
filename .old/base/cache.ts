import { writeIfDiff } from './utils.ts'
import { resolve, fromFileUrl } from 'https://deno.land/std@0.154.0/path/mod.ts';
import download from './download.ts';

export function getHome () {
	//unix/linux
	let r = Deno.env.get('HOME');
	if (r) return r;
	//windows
	r = Deno.env.get('HOMEPATH')
	if (r) return r;
	return undefined;
}

function evaluateCacheDir () {
	let r:string|undefined = undefined;
	//custom location
	r = Deno.env.get('CCT_CACHE');
	if (r) return r;
	
	r = getHome();
	if (r) return resolve(r, '.cct_cache');
	
	console.log("Not found env.var. CCT_CACHE (custom local)");
	console.log("Not found env.var. HOME (unix/linux user folder, %$HOME%/.cct_cache)");
	console.log("Not found env.var. HOMEPATH (windows user folder, $HOME/.cct_cache)");
	throw "Cant found a local to store the cct cache, define env.var. CCT_CACHE as a path to a empty folder.";
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