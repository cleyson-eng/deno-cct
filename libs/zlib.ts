import * as D from '../data.ts'
import { Downloader } from '../util/download.ts';
import { compress } from '../util/exec.ts';
import { path as P } from '../deps.ts';
import CMakeFixer from '../util/fixers/cmake.ts';
import { BuildType } from '../util/target.ts';
import { Arch } from '../util/target.ts';
import { CMake, CMakeCrossOps } from '../compile/mod.ts';
import * as afs from '../util/agnosticFS.ts';
import { deepClone } from '../util/utils.ts';

export type Version = '1.2.13'|'1.2.12'|'1.2.11';

//Assembler optimization deprecated and removed in 1.2.12: https://github.com/madler/zlib/issues/609

export async function main (cmakeOpts:CMakeCrossOps, version:Version, btype:BuildType.DEBUG|BuildType.RELEASE_FAST):Promise<D.LibraryMeta[]> {
	let bsuffix = '';
	if (btype == BuildType.DEBUG) bsuffix += '-debug';

	const proot = D.projectRoot(`zlib-${version}`);
	const srcLink = `https://www.zlib.net/fossils/zlib-${version}.tar.gz`;
	const zipFile = proot(D.Scope.GLOBAL, `cache/zlib-${version}.tar.gz`);
	const srcRoot = proot(D.Scope.GLOBAL, `cache/zlib-${version}`);
	const buildRoot = proot(D.Scope.TARGET, `build${bsuffix}`);
	const binInc = proot(D.Scope.TARGET, `inc${bsuffix}`);
	
	//acquire source
	await D.kv(D.Scope.GLOBAL).markProgressAsync(`zlib-${version}-download&unzip`, async ()=>{
		const dm = new Downloader();
		await dm.wait({
			thrownOnReturnFail:true,
			logList:true,
			logProgress:true,
		}, dm.download(srcLink, zipFile, 'zlib'))

		await compress(zipFile, P.resolve(srcRoot,'..'));
		
		(new CMakeFixer(srcRoot))
			.banInstalls()
			.banPrograms()
			.fixCStandard()
			.fixPIC()
			.save();
	});

	//build
	await D.kv(D.Scope.TARGET).markProgressAsync(`zlib-${version}-build${bsuffix}`, async ()=> {
		afs.mkdir(buildRoot);
		const args = [
			'-B', buildRoot,
			'-S', srcRoot,
			(btype == BuildType.DEBUG)?'redebug':'rerelease',
			'-DSKIP_INSTALL_ALL=ON'
		];
		if (!(await CMake(D.curTarget, args, cmakeOpts)).success)
			throw "failed";

		afs.mkdir(binInc);

		afs.search(srcRoot, (path:string, isFile:boolean)=>{
			if (isFile && P.basename(path) == 'zlib.h')
				afs.copy(path, P.resolve(binInc, 'zlib.h'));
			return true;
		});
		afs.search(buildRoot, (path:string, isFile:boolean)=>{
			if (isFile && P.basename(path) == 'zconf.h')
				afs.copy(path, P.resolve(binInc, 'zconf.h'));
			return true;
		});
	});

	const template = {
		pa:D.curTarget,
		uname:`zlib-${version+bsuffix}`,
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

	const r:D.LibraryMeta[] = [];

	if (lib_sta.length > 0)
		r.push(deepClone(template, {bin:lib_sta}));
	if (lib_dyn.length > 0)
		r.push(deepClone(template, {bin:lib_dyn}));
	return r;
}