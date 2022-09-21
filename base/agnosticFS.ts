export function statSync(p:string):Deno.FileInfo {
	const r = Deno.statSync(p);
	if (!r.isSymlink)
		return r;
	const pd = Deno.realPathSync(p);
	try {
		return statSync(pd);
	} catch (_) {
		r.isSymlink = false;
		r.isFile = true;
		return r;
	}
}
export function readTextFileSync(p:string):string {
	const r = Deno.statSync(p);
	if (!r.isSymlink)
		return Deno.readTextFileSync(p);
	return readTextFileSync(Deno.realPathSync(p));
}
export function writeTextFileSync(p:string, txt:string) {
	let isSym = false;
	try {
		isSym = Deno.statSync(p).isSymlink;
		//deno-lint-ignore no-empty
	} catch (_) {}
	if (!isSym)
		return Deno.writeTextFileSync(p, txt);
	writeTextFileSync(Deno.realPathSync(p), txt);
}
export function readDirSync(p:string):Iterable<Deno.DirEntry> {
	const r = Deno.statSync(p);
	if (!r.isSymlink)
		return Deno.readDirSync(p);
	return readDirSync(Deno.realPathSync(p));
}