/*equal download.ts but postAsync(0~1 or -1, text) to log progression*/
import { writeAll } from "https://deno.land/std@0.154.0/streams/conversion.ts";
import { compress } from "./utils.ts";
import { mkdirFile } from "./agnosticFS.ts";
import { formatByteSize, gitArchive } from "./download.ts";

type PostAsync = (p:number, t:string)=>void;

export async function httpArchiveAsync(postProgress:PostAsync, src:string, dst:string, hidden?:boolean) {
	mkdirFile(dst);

	const res = await fetch(src);
	const file = await Deno.open(dst, { create: true, write: true })
	
	if (res.body == undefined) {
		console.log(res.status + ` (${src})`);
		throw "no body";
	}
	if (res.status >= 300) {
		console.log(res.status + ` (${src})`);
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

		let format = 'Downloading... '+ formatByteSize(progress);
		if (!isNaN(size)) {
			format += ' of '+formatByteSize(size);
			postProgress(progress/size, format);
		} else
			postProgress(-1, format);
	}
	if (hidden !== true)
		console.log (`\nDownload complete!`);
}
export default async function downloadAsync(postProgress:PostAsync, src:string, dst:string, zipcache?:string) {
	if (src.endsWith('.git')) {
		postProgress(-1, "Running git...");
		await gitArchive(src, dst, true);
		postProgress(1, "Finalized git");
		return;
	}
	if (zipcache) {
		await httpArchiveAsync((p, t)=>{
			if (p > 0) p *= 0.9;
			postProgress(p, t);
		},src, zipcache);
		postProgress(0.9, "unziping...");
		await compress(zipcache, dst);
		postProgress(1, "unziped");
		return;
	}
	await httpArchiveAsync(postProgress, src, dst);
}