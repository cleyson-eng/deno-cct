import { path } from '../deps.ts';

export function realPath(p:string):string {
	return Deno.realPathSync(p);
}
export function stat(p:string):Deno.FileInfo {
	return Deno.statSync(realPath(p));
}
export function readTextFile(p:string):string {
	return Deno.readTextFileSync(realPath(p));
}
export function writeTextFile(p:string, txt:string, opts?:{ifdiff?:boolean,mkdir?:boolean}) {
	try {
		p = realPath(p);
		if (opts && opts.ifdiff && readTextFile(p) == txt)
			return;
	} catch(_) {
		if (opts && opts.mkdir)
			mkdirFile(p);
	}
	Deno.writeTextFileSync(p, txt);
}
export function readDir(p:string):Iterable<Deno.DirEntry> {
	return Deno.readDirSync(realPath(p));
}
export function search(root:string, filter:(path:string, isFile:boolean)=>boolean) {
	const s = stat(root);
	const res = filter(root, !s.isDirectory);
	if (!res || !s.isDirectory) return;
	Array.from(readDir(root)).forEach((x)=>search(path.resolve(root, x.name), filter));
}
export function searchRelative(root:string, relative:string, filter:(path:string, relative:string, isFile:boolean)=>boolean) {
	const s = stat(root);
	const res = filter(root, relative, !s.isDirectory);
	if (!res || !s.isDirectory) return;
	Array.from(readDir(root)).forEach((x)=>searchRelative(path.resolve(root, x.name), path.join(relative, x.name), filter));
}
export function mkdir(p:string) {
	try{stat(p);}
	catch(_){Deno.mkdirSync(p, {recursive:true});}
}
export function mkdirFile(p:string) {
	mkdir(path.resolve(p,'..'));
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
export function exists(p:string, opts?:{mustbeFolder?:boolean, mustbeFile?:boolean}) {
	try {
		const i = stat(p);
		if (opts && (
			(opts.mustbeFolder && !i.isDirectory) ||
			(opts.mustbeFile && !i.isFile)
		)) {
			return false;
		}
		return true;
	// deno-lint-ignore no-empty
	} catch (_) {}
	return false;
}