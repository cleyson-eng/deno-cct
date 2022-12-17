//as need
export async function awaitAny<T>(...r:(T|Promise<T>)[]) {
	for (let i = 0; i < r.length; i ++) {
		//@ts-ignore;
		while (r[i] && r[i].then) r[i] = await r[i];
	}
	if (r.length == 1)
		return r[0] as T;
	return r as T[];
}
export function mergeMaps<T,Z> (...maps:Map<T,Z>[]):Map<T,Z> {
	const r = new Map<T,Z>();
	maps.forEach((x)=>Array.from(x.keys()).forEach((k)=>r.set(k, x.get(k) as Z)))
	return r;
}
//deno-lint-ignore no-explicit-any
export function extractEnumPairs<T>(x:any):{t:string, v:T}[] {
	const k:string[] = Object.keys(x);
	if (typeof k[0] === 'number')
		k.splice(0, k.length/2)
	return k.map((ks)=>({t:ks, v:x[ks] as T}))
}
export function matchString(x:string, ...valids:(string|RegExp)[]) {
	return valids.find((unkf)=>{
		const r = unkf as RegExp;
		//@ts-ignore type diff
		if (r.exec)
			return r.exec(x)!=null;
		const f = unkf as string;
		const frags = f.split('*');
		if (frags.length == 1)
			return frags[0] == x;
		let ptr = 0;
		for (let i = 0; i < frags.length; i++) {
			if (frags[i] == '') continue;
			if (i == 0) {
				if (x.startsWith(frags[0])) {
					ptr = frags[0].length;
					continue;
				}
				return false;
			}
			if (i == frags.length - 1) {
				if (x.length >= ptr + frags[i].length && x.endsWith(frags[i]))
					continue;
				return false;
			}
			const idf = x.indexOf(frags[i], ptr);
			if (idf < 0) return false;
			ptr += frags[i].length;
		}
		return true;
	})!=null;
}
//deno-lint-ignore no-explicit-any
export function deepClone(x:any, append?:any):any {
	if (typeof x == 'object') {
		if (Array.isArray(x)) {
			//deno-lint-ignore no-explicit-any
			const r:any[] = [];
			x.forEach((x)=>r.push(deepClone(x)));
			if (append && Array.isArray(append))
				r.push(...append);
			return r;
		} else {
			//deno-lint-ignore no-explicit-any
			const r:Record<any,any> = {};
			Object.keys(x).forEach((key)=>r[key]=deepClone(x[key]));
			if (append && typeof append == "object")
				Object.keys(append).forEach((key)=>r[key]=(append[key]));
			return r;
		}
	}
	return x;
}