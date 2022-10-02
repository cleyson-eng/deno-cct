import { listRequirement } from '../base/interfaces.ts';
import { cachedKeys, getHome } from '../base/cache.ts';
import { Button, fileAssistent, Form, Label, TextBox } from '../base/cli.ts';
import { exists } from '../base/agnosticFS.ts';
import { resolve } from 'https://deno.land/std@0.154.0/path/mod.ts';
import { Toolchain } from './auxi/toolchain.ts';

export interface NDKVars{
	cmakeTC:string
	sdk:string
	nativeTC:Map<string, Toolchain>
}
export const androidNdk = {
	name:"android-ndk",
	title:"Android NDK",
	//deno-lint-ignore require-await
	require:async (pc?:boolean)=>{
		if (pc) {
			cachedKeys.delete('android-ndk');
			cachedKeys.delete('android-ndk-sdk');
		} else {
			const ndkFolder = cachedKeys.get('android-ndk');
			const ndkSDK = cachedKeys.get('android-ndk-sdk');
			if (ndkFolder && ndkSDK)
				return getNDKVars(ndkFolder, ndkSDK);
		}
		return undefined;
	},
	configure:async function (v?:string) {
		if (v)
			return false;
		let cv = cachedKeys.get('android-ndk');
		let cs = cachedKeys.get('android-ndk-sdk');
		let base_home = getHome();
		if (base_home == undefined)
			base_home = '/';

		let cwd = resolve(base_home,'/Android/Sdk/ndk');
		if (!exists(cwd))
			cwd = resolve(base_home);

		const label_cv = new Label(`current: ${cv?cv:'<none>'}`);
		const bt_valid = new Button('Validate', ()=>{
			if (cv && cs)
				bt_valid.title = `Validate (${getNDKVars(cv, cs)?"OK":"ERROR"})`
		})
		const label_cs = new Label(getSDKVersions(cv));
		const tb_cs = new TextBox('SDK: ', cs, ()=>{ cs = tb_cs.value; });
		const f = new Form([
			new Button('Apply', ()=>{f.closeSignal=true;}),
			bt_valid,
			new Label('*Normally at "~/Android/Sdk/ndk/{version}"'),
			label_cv,
			new Button('Locate NDK ...', async ()=>{
				const ccv = (await fileAssistent({cwd, folder:true}))[0];
				if (ccv) {
					cv = ccv;
					label_cv.title = `current: ${ccv}`;
					bt_valid.title = 'Validate';
					label_cs.title = getSDKVersions(cv);
				}
			}),
			label_cs,
			tb_cs
		]);
		await f.run();
		if (cv)
			cachedKeys.set('android-ndk', cv);
		if (cs)
			cachedKeys.set('android-ndk-sdk', cs);
		return true;
	}
}
function getNDKbin(p:string):string|undefined {
	p = resolve(p, 'toolchains/llvm/prebuilt');
	if (!exists(p))
		return;
	const proot = Array.from(Deno.readDirSync(p)).find((f)=>exists(resolve(p, f.name, 'bin')))
	if (proot == undefined)
		return;
	return resolve(p, proot.name, 'bin');
}
function getSDKVersions(p:string|undefined):string {
	if (p) {
		const pbin = getNDKbin(p);
		if (pbin) {
			const versions = 
				Array.from(Deno.readDirSync(pbin))
					.map((x)=>{
						const res = /android([0-9]+)-clang/g.exec(x.name);
						return res && res[1]?parseInt(res[1]):undefined
					})
					.filter((x)=>x)
					.filter((x, xi, xarr)=> xarr.indexOf(x) == xi)
					.sort() as number[];
			if (versions.length > 0) {
				const intervals:string[] = [];
				let ref_init = -1;
				let ref_last = 0;
				versions.forEach((value)=>{
					if (ref_init >= 0) {
						if (value == ref_last + 1)
							ref_last = value;
						else {
							intervals.push(
								ref_init==ref_last?
								ref_init+"":
								`${ref_init}-${ref_last}`
							)
							ref_init = value;
							ref_last = value;
						}
					} else {
						ref_init = value;
						ref_last = value;
					}
				})
				intervals.push(
					ref_init==ref_last?
					ref_init+"":
					`${ref_init}-${ref_last}`
				)
				return `Found SDK versions:${intervals.map((x)=>' '+x).join(';')} (oldest versions not for all architectures)`;
			} else
				return `SDKs: err.: no sdk versions found at "${pbin}"`;
		}
		return `SDKs: err.: cant found "${pbin}"`;
	}
	return 'SDKs: err.: select a ndk';
}
function getNDKVars(p:string, sdk:string):NDKVars|undefined {
	const cmakeTC = resolve(p, 'build/cmake/android.toolchain.cmake');
	if (!exists(cmakeTC))
		return undefined;
	const pbin = getNDKbin(p);
	if (pbin == undefined)
		return undefined;

	const tcs = new Map<string, Toolchain>();
	const ld = resolve(pbin, 'ld');
	const post = Deno.build.os == 'windows'?'.exe':'';

	const androidTNames = ['i686-linux-android','x86_64-linux-android','arm-linux-androideabi','aarch64-linux-android'];
	['x32','x64','arm','a64'].forEach((arch, xi)=>{
		const base = resolve(pbin, androidTNames[xi]);
		const base_sdk = resolve(pbin, androidTNames[xi])+sdk;
		tcs.set(arch, {
			c:resolve(base_sdk+'-clang'+post),
			cxx:resolve(base_sdk+'-clang++'+post),
			ranlib:resolve(base+'-ranlib'+post),
			ar:resolve(base+'-ar'+post),
			strip:resolve(base+'-strip'+post),
			ld:ld+post
		});
		
	});
	return {
		cmakeTC,
		sdk,
		nativeTC:tcs
	};
}
listRequirement.push(androidNdk);