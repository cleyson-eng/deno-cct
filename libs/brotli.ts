import * as D from '../data.ts'
import { Downloader } from '../util/download.ts';
import { compress } from '../util/exec.ts';
import { path as P } from '../deps.ts';
import CMakeFixer from '../util/fixers/cmake.ts';
import { BuildType } from '../util/target.ts';
import { CMake, CMakeCrossOps } from '../compile/mod.ts';
import * as afs from '../util/agnosticFS.ts';
import { deepClone, removeSymlinkClones } from '../util/utils.ts';
import { exitError } from '../util/exit.ts';
import { LibraryMeta } from '../LibraryMeta.ts';

export type Version = '1.0.9';


export async function main (cmakeOpts:CMakeCrossOps, version:Version, btype:BuildType.DEBUG|BuildType.RELEASE_FAST):Promise<LibraryMeta[]> {
	let bsuffix = '';
	if (btype == BuildType.DEBUG) bsuffix += '-debug';

	const proot = D.projectRoot(`brotli-${version}`);
	const srcLink = `https://codeload.github.com/google/brotli/tar.gz/refs/tags/v${version}`;
	const zipFile = proot(D.Scope.GLOBAL, `cache/brotli-${version}.tar.gz`);
	const srcRoot = proot(D.Scope.GLOBAL, `cache/brotli-${version}`);
	const buildRoot = proot(D.Scope.TARGET, `build${bsuffix}`);
	const binInc = P.resolve(srcRoot, 'c/include/brotli')
	
	//acquire source
	await D.kv(D.Scope.GLOBAL).markProgressAsync(`brotli-${version}-download&unzip`, async ()=>{
		const dm = new Downloader();
		await dm.wait({
			thrownOnReturnFail:true,
			logList:true,
			logProgress:true,
		}, dm.download(srcLink, zipFile, 'brotli'))

		await compress(zipFile, P.resolve(srcRoot,'..'));
		
		(new CMakeFixer(srcRoot))
			.banInstalls()
			.banPrograms()
			.fixCStandard()
			.fixPIC()
			.save();
	});

	//build
	await D.kv(D.Scope.TARGET).markProgressAsync(`brotli-${version}-build${bsuffix}`, async ()=> {
		afs.mkdir(buildRoot);
		const args = [
			'-B', buildRoot,
			'-S', srcRoot,
			(btype == BuildType.DEBUG)?'redebug':'rerelease',
			'-DBROTLI_DISABLE_TESTS=on','-DENABLE_COVERAGE=no'
		];
		if (!(await CMake(args, cmakeOpts)).success)
			throw exitError("failed");
	});

	const template = {
		pa:D.curTarget,
		name:`brotli`,
		version,
		debug:btype == BuildType.DEBUG,
		inc:[binInc],
	};

	const lib_sta:string[] = [];
	const lib_dyn:string[] = [];

	afs.search(buildRoot, (path:string, isFile:boolean)=>{
		if (!isFile) return true;
		switch (P.extname(path)) {
		case '.lib':
			if (P.basename(path).indexOf('static') < 0) {
				lib_dyn.push(path);
				break;
			}
			/*falls through*/
		case '.a':
			lib_sta.push(path);
			break;
		case '.dylib':
		case '.so':
		case '.dll':
			lib_dyn.push(path);
			break;
		}
		return true;
	});
	removeSymlinkClones(lib_sta);
	removeSymlinkClones(lib_dyn);

	const r:LibraryMeta[] = [];

	if (lib_sta.length > 0)
		r.push(new LibraryMeta(deepClone(template, {bin:lib_sta})));
	if (lib_dyn.length > 0)
		r.push(new LibraryMeta(deepClone(template, {bin:lib_dyn})));

	return LibraryMeta.multReorderBin(r, {r:/brotlienc/}, {r:/brotlidec/}, {r:/brotlicommon/})
}