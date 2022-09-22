import { writeAll } from "https://deno.land/std@0.154.0/streams/conversion.ts";
import { exec, compress } from "./utils.ts";
import { progressBarString } from './cli.ts';
import { statSync } from "./agnosticFS.ts";
import { resolve } from "https://deno.land/std@0.154.0/path/mod.ts";

function formatByteSize(x:number):string {
	if (!isNaN(x)) {
		if (x < 1024)
			return x.toFixed()+"b";
		if (x < 1024*1024)
			return (x/1024).toFixed(1)+"kb";
		return (x/(1024*1024)).toFixed(1)+"mb";
	}
	return "NaN";
}
export async function httpArchive(src:string, dst:string) {
	const dst_folder = resolve(dst, '..');
	try {
		statSync(dst_folder);
	} catch (_) {
		Deno.mkdirSync(dst_folder, {recursive:true});
	}

	const res = await fetch(src);
	const file = await Deno.open(dst, { create: true, write: true })

	console.log(`Download (${src}) => ${dst}`);

	if (res.body == undefined)
		throw "no body";
	if (res.status >= 300) {
		console.log(res.status);
		throw "broken link";
	}
	const _size = res.headers.get("Content-Length");
	const size = _size?parseInt(_size):NaN;
	let progress = 0;

	for await(const chunk of res.body) {
		progress += chunk.byteLength;
		await writeAll(file, chunk);

		let format = '';
		if (!isNaN(size)) {
			const complete = progress/size;
			format = progressBarString((100*complete).toFixed()+"% ("+formatByteSize(size)+")", complete)
		} else
			format = `...`+formatByteSize(progress);

		await Deno.stdout.write(new TextEncoder().encode(format+"\r"));
	}
	console.log (`\nDownload complete!`);
}
export async function gitArchive(src:string, dst:string) {
	const res = await exec(dst,['git','clone','--recursive',src]);
	if (!res.success)
		throw "Git Failed";
}
export default async function download(src:string, dst:string, zipcache?:string) {
	if (src.endsWith('.git'))
		return await gitArchive(src, dst);
	if (zipcache) {
		await httpArchive(src, zipcache);
		await compress(zipcache, dst);
		return;
	}
	await httpArchive(src, dst);
}