import { resolve, fromFileUrl } from 'https://deno.land/std@0.154.0/path/mod.ts';

const dir = fromFileUrl(new URL('.', import.meta.url));

const res:Record<string, Record<string, string[]>> = {};

function getVersions(path:string, obj:Record<string, string[]>, filename:string) {
	console.log(path);
	const txt = Deno.readTextFileSync(path);
	console.log(txt);
	const vcapture = /const[\s]+VERSIONS[\s]*=[\s]*(\[[^\]]*\])/gi.exec(txt);
	console.log(vcapture);
	if (vcapture && vcapture.length > 1)
		obj[filename] = JSON.parse(vcapture[1].replaceAll('\'','"'));
	
	const blcapture = /\<[\s]*no-target[\s]*\>[\s\S]+\<\/[\s]*no-target[\s]*\>/gi.exec(txt);
	if (blcapture && blcapture.length > 1) {
		if (obj['@no-target'] == undefined)
			obj['@no-target'] = [];
		obj['@no-target'].push(...blcapture[1].split(';').map((x)=>x.trim()).filter((x)=>x.length>0));
	}
	const wlcapture = /\<[\s]*target[\s]*\>[\s\S]+\<\/[\s]*target[\s]*\>/gi.exec(txt);
	if (wlcapture && wlcapture.length > 1) {
		if (obj['@target'] == undefined)
			obj['@target'] = [];
		obj['@target'].push(...wlcapture[1].split(';').map((x)=>x.trim()).filter((x)=>x.length>0));
	}
}

Array.from(
	Deno.readDirSync(dir)
).filter((x)=>
	(x.isDirectory || x.name.endsWith('.ts')) &&
	x.name.length>4 &&
	!x.name.startsWith('_')
).forEach((x)=>{
	if (x.isFile) {
		const libname = x.name.substring(0, x.name.length-3);
		if (res[libname] == undefined)
			res[libname] = {};
		getVersions(resolve(dir, x.name), res[libname], '.ts');
	} else {
		const libname = x.name;
		Array.from(Deno.readDirSync(resolve(dir, x.name)))
			.filter((x)=>
				x.isFile && x.name.endsWith('.ts') &&
				x.name.length > 4 &&
				!x.name.startsWith('_')
			).forEach((y)=>{
				if (res[libname] == undefined)
					res[libname] = {};
				getVersions(resolve(dir, x.name), res[libname], y.name);
			});
	}
})

Object.keys(res).forEach((k)=>{
	let vcount = 0;
	Object.keys(res[k]).filter((x)=>!x.startsWith('@')).forEach((k2)=>{
		const vcount2 = res[k][k2].length;
		if (vcount2 <= 0)
			delete res[k][k2];
		else
			vcount += vcount2;
	});

	if (vcount <= 0)
		delete res[k];
})

Deno.writeTextFile('_.ts',
`export const LIBS:Record<string, Record<string, string[]>> = ${JSON.stringify(res)}`
);