import { resolve, join } from "https://deno.land/std@0.154.0/path/mod.ts";

export function realPath(p:string):string {
	const r = Deno.statSync(p);
	if (!r.isSymlink)
		return p;
	return realPath(Deno.realPathSync(p));
}
export function stat(p:string):Deno.FileInfo {
	return Deno.statSync(realPath(p));
}
export function readTextFile(p:string):string {
	return Deno.readTextFileSync(realPath(p));
}
export function writeTextFile(p:string, txt:string) {
	//deno-lint-ignore no-empty
	try {p = realPath(p);}catch(_){}
	Deno.writeTextFileSync(p, txt);
}
export function readDir(p:string):Iterable<Deno.DirEntry> {
	return Deno.readDirSync(realPath(p));
}
export function search(root:string, filter:(path:string, isFile:boolean)=>boolean) {
	const s = stat(root);
	const res = filter(root, !s.isDirectory);
	if (!res || !s.isDirectory) return;
	Array.from(readDir(root)).forEach((x)=>search(resolve(root, x.name), filter));
}
export function searchRelative(root:string, relative:string, filter:(path:string, relative:string, isFile:boolean)=>boolean) {
	const s = stat(root);
	const res = filter(root, relative, !s.isDirectory);
	if (!res || !s.isDirectory) return;
	Array.from(readDir(root)).forEach((x)=>searchRelative(resolve(root, x.name), join(relative, x.name), filter));
}
export function mkdir(p:string) {
	try {
		stat(p);
	} catch (_) {
		Deno.mkdirSync(p, {recursive:true});
	}
}
export function mkdirFile(p:string) {
	mkdir(resolve(p,'..'));
}
export function copy(src:string, dst:string) {
	searchRelative(src, dst, (path:string, relative:string, isFile:boolean)=>{
		if (isFile)
			Deno.copyFileSync(realPath(path), relative);
		else
			mkdir(relative);
		return true;
	});
}
export function exists(p:string) {
	try {
		stat(p);
		return true;
	// deno-lint-ignore no-empty
	} catch (_) {}
	return false;
}