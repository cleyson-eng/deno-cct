import { mkdirFile } from "./agnosticFS.ts";
import { exec } from './exec.ts';
import { writeAll } from '../deps.ts';

enum GITStage {
	ENUM = 0,
	COUNTING = 1,
	COMPRESSING = 2,
	RECEIVING = 3,
	RESOLVING = 4,
}

export async function gitArchive(src:string, dst:string, opts?:{pipeOutput?:boolean, progress:(
	stage:GITStage,
	progress:number,
)=>void}) {
	const res = await exec(dst,['git','clone','--recursive',src], {pipeOutput:opts&&opts.pipeOutput});
	return res.success;
}
interface DItem {
	uid:number
	src:string
	dst:string
	label?:string
	progress?:number
	state:"..."|"RUN"|"FUL"|"ERR"
	cancelFlag?:boolean
}
export class Downloader {
	private items:DItem[] = []
	private uidgen = 0
	private async downloadThread(uid:number) {
		const v = this.getByUid(uid) as DItem;
		//?GIT
		if (v.src.endsWith('.git')) {
			v.state = "RUN";
			v.state = (await gitArchive(v.src, v.dst, {progress:(s,p)=>{
				v.progress = ((s*100)+p)/5;
			}}))?"FUL":"ERR";
			return;
		}

		//HTTP commun file download
		mkdirFile(v.dst);

		const res = await fetch(v.src);
		const file = await Deno.open(v.dst, { create: true, write: true })
		
		if (res.body == undefined) {
			//console.log(res.status + ` (${v.src})`);
			v.state = "ERR";
			return;
			//throw "no body";
		}
		if (res.status >= 300) {
			//console.log(res.status + ` (${v.src})`);
			v.state = "ERR";
			return;
			//throw "broken link";
		}
		const _size = res.headers.get("Content-Length");
		const size = _size?parseInt(_size):NaN;
		let progress = 0;

		v.state = "RUN"
		for await(const chunk of res.body) {
			progress += chunk.byteLength;
			await writeAll(file, chunk);

			if (!isNaN(size))
				v.progress = progress*100/size;
		}
		v.state = "FUL";
	}
	download(src:string, dst:string, label?:string):number {
		const uid = this.uidgen++;
		this.items.push({
			uid,
			src,
			dst,
			label,
			state:"...",
		});
		this.downloadThread(uid);
		return uid;
	}
	printList() {
		console.log("<Current downloads>");
		this.items.forEach((v)=>{
			let txt = `[${v.uid}] `;
			if (v.label) txt += v.label + ": ";
			txt += ` ${v.src} => ${v.dst}`;
			console.log(txt);
		});
		console.log("</Current downloads>\n");
	}
	async printProgress() {
		await Deno.stdout.write(new TextEncoder().encode(
			'D.: '+
			this.items.map((v)=>{
				let s = v.state as string;
				if (s == 'RUN' && v.progress) {
					s = '%'+v.progress.toFixed(0);
					if (s.length > 3) s = '%99'
					if (s.length < 3) s += ' ';
				}
				return v.uid+':'+s;
			}).join(' ')+"\r"
		));
	}
	getByUid(uid:number) {
		return this.items.find((v)=>v.uid == uid);
	}
	async wait(opts:{
		logList?:boolean,
		logProgress?:boolean,
		// on any fail (multiple download scene)
		returnOnFail?:boolean|{andStopDownloads?:boolean},
		thrownOnReturnFail:boolean
	}, ...uids:number[]):Promise<boolean> {
		let result = true;
		if (opts.logList)
			this.printList();
		if (uids.length == 0)
			uids = this.items.map((v)=>v.uid);
		while (uids.length > 0) {
			await (new Promise((res)=>setTimeout(res, 100)));
			for (let i = 0; i < uids.length; i++) {
				const v = this.getByUid(uids[i]);
				if (v == undefined) {
					uids.splice(i,1);
					i--;
					continue;
				}
				if (v.state == "ERR") {
					result = false;
					uids.splice(i,1);
					i--;
				}
				if (v.state == "FUL") {
					uids.splice(i,1);
					i--;
				}
			}
			if (opts.logProgress) await this.printProgress();
			if (opts.returnOnFail && !result) break;
		}
		console.log('');
		console.log(result);
		if (typeof opts.returnOnFail == "object" && opts.returnOnFail.andStopDownloads) {
			uids.forEach((uid)=>{
				const e = this.getByUid(uid);
				if (e) e.cancelFlag = true;
			});
			if (opts.logProgress)
				console.log("Failed, canceling any incomplete download");
		}
		if (!result && opts.thrownOnReturnFail) {
			throw "Failed download";
		}
		return result;
	}
}