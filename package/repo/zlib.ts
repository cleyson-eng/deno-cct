import { resolve } from "https://deno.land/std@0.154.0/path/mod.ts";
import download from "../../base/download.ts";
import { Arch } from "../../base/target.ts";
import { writeIfDiff } from "../../base/utils.ts";
import { PackageBuild, PackageInfo, RequestType } from "../api_package.ts";
import * as cc from "./_utils/cmake_correct.ts";

export const VERSIONS = ['1.2.12','1.2.11'];


export const info = class extends PackageInfo {
	isSourceTargetDependent(): boolean { return false; }
	requests(): Record<string, RequestType> {
		return {
			'asm':{
				type:'prop',
				possibleValues:['enabled','disabled'],
				defautValue:'enabled'
			},
		};
	}
	async getSource(hidden:boolean): Promise<void> {
		await this.markProgress(this.cacheFolder, 'download', async ()=>{
			await download(`https://www.zlib.net/fossils/zlib-${this.packVersion}.tar.gz`, this.cacheFolder, resolve(this.cacheFolder, `zlib-${this.packVersion}.tar.gz`), hidden);
		});
		await this.markProgress(this.cacheFolder, 'cmake', ()=>{
			const p = resolve(this.cacheFolder, `zlib-${this.packVersion}`, 'CMakeLists.txt');
			let t = Deno.readTextFileSync(p);
			t = cc.banInstalls(t);
			t = cc.banPrograms(t, false);
			t = cc.fixCStandard(t);
			t = cc.fixPIC(t);
			writeIfDiff(p, t);
		});
	}
};
export const build = class extends PackageBuild {
	async build() {
		await this.markProgressBuild('cmake', async ()=>{
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
			arg.push()
			await (await this.getTool('cmake'))([
				'-B',this.output_build,
				'-S',this.cacheSource,
				'rerelease',
				'-DSKIP_INSTALL_ALL=ON',
				...arg
			],0);
		});
	}	
};