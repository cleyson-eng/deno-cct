import { resolve } from "https://deno.land/std@0.154.0/path/mod.ts";
import downloadAsync from "../../base/downloadAsync.ts";
import { Arch } from "../../base/target.ts";
import { matchString, writeIfDiff } from "../../base/utils.ts";
import { PackageMaker, PMBinDescType, RequestType } from "../package.ts";
import * as cc from "./_utils/cmake_correct.ts";
import * as afs from '../../base/agnosticFS.ts';
import { basename } from "https://deno.land/std@0.154.0/path/win32.ts";

export const VERSIONS = ['1.2.12','1.2.11'];

export const D = class extends PackageMaker {
	isSourceTargetDependent(): boolean { return false; }
	options(): Record<string, RequestType> {
		if ([Arch.X86_32, Arch.X86_64].find((x)=>x==this.packTarget.arch)!=undefined)
			return {
				'asm':{
					type:'prop',
					possibleValues:'enabled;disabled',
					defautValue:'enabled'
				},
			};
		return {};
	}
	async source(): Promise<void> {
		afs.mkdir(this.cacheSource);
		await this.saveProgress(async ()=>{
			await downloadAsync(this.postAsyncStatus.bind(this), `https://www.zlib.net/fossils/zlib-${this.packVersion}.tar.gz`, this.cacheSource, resolve(this.cacheSource, `zlib-${this.packVersion}.tar.gz`));
		},()=>{
			const p = resolve(this.cacheSource, `zlib-${this.packVersion}`, 'CMakeLists.txt');
			let t = Deno.readTextFileSync(p);
			t = cc.banInstalls(t);
			t = cc.banPrograms(t, false);
			t = cc.fixCStandard(t);
			t = cc.fixPIC(t);
			writeIfDiff(p, t);
		});
	}
	async build() {
		afs.mkdir(this.cacheBuild);
		const arg:string[] = [];
		if (this.preferences['asm'] == 'enabled') {
			switch (this.packTarget.arch) {
			case Arch.X86_32:
				arg.push('-DASM686=ON');
				break;
			case Arch.X86_64:
				arg.push('-DAMD64=ON');
				break;
			}
		}
		const r = await (await this.getTool('cmake'))([
			'-B',this.cacheBuild,
			'-S',resolve(this.cacheSource, `zlib-${this.packVersion}`),
			'rerelease',
			'-DSKIP_INSTALL_ALL=ON',
			...arg
		],0);
		if (r.code != 0) throw 'failed';
	}
	//deno-lint-ignore require-await
	async bin () {
		const include = resolve(this.cacheBin, 'inc');
		const lstatic:PMBinDescType = {
			type:'static',
			incDirs:[include],
			incBins:[]
		};
		const ldynamic:PMBinDescType = {
			type:'dynamic',
			incDirs:[include],
			incBins:[]
		};

		afs.mkdir(include);
		afs.search(this.cacheSource, (path:string, isFile:boolean)=>{
			if (isFile && basename(path) == 'zlib.h')
				afs.copy(path, resolve(include, 'zlib.h'));
			return true;
		});
		afs.search(this.cacheBuild, (path:string, isFile:boolean)=>{
			if (isFile) {
				const bname = basename(path);
				if (bname == 'zconf.h')
					afs.copy(path, resolve(include, 'zconf.h'));
				else if (matchString(bname, '*.a'))
					lstatic.incBins.push(path);
				else if (matchString(bname, '*.so'))
					ldynamic.incBins.push(path);
			}
			return true;
		});

		return [ldynamic, lstatic];
	}
}