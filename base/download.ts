import { writeAll } from "https://deno.land/std@0.154.0/streams/conversion.ts";
import { exec, compress } from "./utils.ts";
import { progressBarString } from './cli.ts';
import { mkdirFile } from "./agnosticFS.ts";

export function formatByteSize(x:number):string {
	if (!isNaN(x)) {
		if (x < 1024)
			return x.toFixed()+"b";
		if (x < 1024*1024)
			return (x/1024).toFixed(1)+"kb";
		return (x/(1024*1024)).toFixed(1)+"mb";
	}
	return "NaN";
}
export async function httpArchive(src:string, dst:string, hidden?:boolean) {
	mkdirFile(dst);

	const res = await fetch(src);
	const file = await Deno.open(dst, { create: true, write: true })

	if (hidden !== true)
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

		if (hidden)
			continue;

		let format = '';
		if (!isNaN(size)) {
			const complete = progress/size;
			format = progressBarString((100*complete).toFixed()+"% ("+formatByteSize(size)+")", complete)
		} else
			format = `...`+formatByteSize(progress);

		await Deno.stdout.write(new TextEncoder().encode(format+"\r"));
	}
	if (hidden !== true)
		console.log (`\nDownload complete!`);
}
export async function gitArchive(src:string, dst:string, hidden?:boolean) {
	const res = await exec(dst,['git','clone','--recursive',src], {pipeOutput:hidden!==true});
	if (!res.success)
		throw "Git Failed";
}
export default async function download(src:string, dst:string, zipcache?:string, hidden?:boolean) {
	if (src.endsWith('.git'))
		return await gitArchive(src, dst, hidden);
	if (zipcache) {
		await httpArchive(src, zipcache, hidden);
		await compress(zipcache, dst);
		return;
	}
	await httpArchive(src, dst, hidden);
}