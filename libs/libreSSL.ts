import * as D from '../data.ts'
import { Downloader } from '../util/download.ts';
import { compress } from '../util/exec.ts';
import { path as P } from '../deps.ts';
import CMakeFixer from '../util/fixers/cmake.ts';
import CodeFixer from '../util/fixers/code.ts';
import { BuildType, hostPA, Platform } from '../util/target.ts';
import { CMake, CMakeCrossOps } from '../compile/mod.ts';
import * as afs from '../util/agnosticFS.ts';
import { removeSymlinkClones } from '../util/utils.ts';
import { exitError } from '../util/exit.ts';
import { exec } from '../util/exec.ts';

export type Version = "3.5.2"|"3.4.3"|"3.3.6"|"3.3.3";

export interface Options {
	activeAsm:boolean
}

export async function main (cmakeOpts:CMakeCrossOps, version:Version, btype:BuildType.DEBUG|BuildType.RELEASE_FAST, ops:Options):Promise<D.LibraryMeta[]> {
	let bsuffix = '';
	if (btype == BuildType.DEBUG) bsuffix += '-debug';

	const proot = D.projectRoot(`libreSSL-${version}`);
	const srcLink = `https://codeload.github.com/libressl-portable/portable/tar.gz/refs/tags/v${version}`;
	const zipFile = proot(D.Scope.GLOBAL, `cache/portable-${version}.tar.gz`);
	const srcRoot = proot(D.Scope.GLOBAL, `cache/portable-${version}`);
	const buildRoot = proot(D.Scope.TARGET, `build${bsuffix}`);
	const binInc = P.resolve(srcRoot, 'include')
	
	//acquire source
	await D.kv(D.Scope.GLOBAL).markProgressAsync(`libreSSL-${version}-download&unzip`, async ()=>{
		const dm = new Downloader();
		await dm.wait({
			thrownOnReturnFail:true,
			logList:true,
			logProgress:true,
		}, dm.download(srcLink, zipFile, 'libreSSL'))

		await compress(zipFile, P.resolve(srcRoot,'..'));
		
		(new CMakeFixer(srcRoot))
			.banInstalls()
			.banPrograms()
			.fixCStandard()
			.fixPIC()
			.custom((txt)=>txt.replace('add_definitions(-Drestrict)',''))
			.save();
	});

	//autogen
	await D.kv(D.Scope.GLOBAL).markProgressAsync(`libreSSL-${version}-autogen`, async ()=>{
		if (hostPA.platform == Platform.WINDOWS)
			throw exitError(`LibreSSL configure stage error: stage not runnable on windows, and not in cache, re run in another system, and run again in windows with same build cache`);
		if (!(await exec(srcRoot, ['sh', 'autogen.sh'], {pipeInput:true, pipeOutput:true})).success)
			throw exitError("failed");
		
		(new CodeFixer(P.resolve(srcRoot, 'crypto/compat/arc4random.c')))
			.inject("emscripten", FIXER_EMSCRIPTEN).save();
		(new CodeFixer(P.resolve(srcRoot, 'include/openssl/opensslconf.h')))
			.inject("apple", FIXER_APPLE).save();
		(new CodeFixer(P.resolve(srcRoot, 'crypto/compat/recallocarray.c')))
			.inject("apple", FIXER_APPLE).save();
		(new CodeFixer(P.resolve(srcRoot, 'crypto/compat/freezero.c')))
			.inject("apple", FIXER_APPLE).save();
	})

	//build
	await D.kv(D.Scope.TARGET).markProgressAsync(`libreSSL-${version}-build${bsuffix}`, async ()=> {
		afs.mkdir(buildRoot);
		const args = [
			'-B', buildRoot,
			'-S', srcRoot,
			(btype == BuildType.DEBUG)?'redebug':'rerelease',
			'-DLIBRESSL_SKIP_INSTALL=ON',
			'-DLIBRESSL_APPS=OFF',
			'-DLIBRESSL_TESTS=OFF',
			'-DENABLE_EXTRATESTS=OFF',
			'-DENABLE_NC=OFF',
			'-DUSE_STATIC_MSVC_RUNTIMES=OFF'
		];
		if (!ops.activeAsm || [Platform.MACOS, Platform.IOS, Platform.IOS_EMU, Platform.BROWSER].find((x)=>x==D.curTarget.platform)!=null)
			args.push('-DENABLE_ASM=OFF');
		if (D.curTarget.platform == Platform.BROWSER)
			args.push('-DCMAKE_C_FLAGS="-D__linux__"');
		if (!(await CMake(D.curTarget, args, cmakeOpts)).success)
			throw exitError("failed");
	});

	const lib_sta:string[] = [];

	afs.search(buildRoot, (path:string, isFile:boolean)=>{
		if (!isFile) return true;
		switch (P.extname(path)) {
		case '.lib':
		case '.a':
			lib_sta.push(path);
			break;
		}
		return true;
	});
	removeSymlinkClones(lib_sta);

	return [{
		pa:D.curTarget,
		uname:`libreSSL`,
		version,
		debug:btype == BuildType.DEBUG,
		inc:[binInc],
		bin:lib_sta
	}];
}


const FIXER_EMSCRIPTEN =
`#if defined(__EMSCRIPTEN__)
//fix bug of undefined size_t of new (2022) emsdk
#include <stdio.h>
#include <sys/random.h>
#endif
`;
const FIXER_APPLE =
`#if defined(__APPLE__) && !defined(FIX_BZERO)
#define FIX_BZERO 1
#include <stddef.h>
#define SYSLOG_DATA_INIT {0}
struct syslog_data {int x;};
void vsyslog_r(int x, ...) {}
inline void explicit_bzero (void* ptr, size_t len) {
  char* p = (char*)ptr;
  for (int i = 0; i < len; i++)
    p[i] = 0;
}
#endif
`