mport { listRequirement, Requirement } from '../base/interfaces.ts';
import { cachedKeys } from '../base/cache.ts';
import { Button, Form, Label, TextBox } from '../base/cli.ts';
import { exec } from '../base/utils.ts';

interface XCodeConfig {
	bundleGUI:string
	macSdkVersion:string
	iosSdkVersion:string
	teamID:string
}
const vdefault:XCodeConfig = {
	bundleGUI:"",
	macSdkVersion:"",
	iosSdkVersion:"",
	teamID:"",
};
function resolveConfig(t2 :Partial<XCodeConfig>, v?:XCodeConfig):XCodeConfig {
	if (v == undefined)
		v = vdefault;
	return ({
		bundleGUI:(t2.bundleGUI && typeof t2.bundleGUI == "string"?t2.bundleGUI:v.bundleGUI),
		macSdkVersion:(t2.macSdkVersion && typeof t2.macSdkVersion == "string"?t2.macSdkVersion:v.macSdkVersion),
		iosSdkVersion:(t2.iosSdkVersion && typeof t2.iosSdkVersion == "string"?t2.iosSdkVersion:v.iosSdkVersion),
		teamID:(t2.teamID && typeof t2.teamID == "string"?t2.teamID:v.teamID),
	});
}
export const xcode = {
	name:"xcode",
	title:"XCode C++",
	require:async (pc?:boolean)=>{
		let t2:Partial<XCodeConfig>|undefined = undefined;
		if (pc) {
			cachedKeys.delete('xcode');
			cachedKeys.delete("xcode_clang");
		} else {
			const t = cachedKeys.get('xcode');
			if (t) t2 = JSON.parse(t);
		}
		if (!cachedKeys.has("xcode_clang")) {
			if (!(await exec('.', ['clang', '--version'])).success) {
				console.log(`%cNot found: clang, broken toolchain`,'color: red;')
				return;
			}
			cachedKeys.set("xcode_clang","T");
		}
		return resolveConfig(t2?t2:{});
	},
	configure:async function (v?:string) {
		const temp = cachedKeys.get('xcode');
		let t = resolveConfig(temp?JSON.parse(temp):{});
		if (v) {
			cachedKeys.set('xcode',JSON.stringify(
				resolveConfig(resolveConfig(JSON.parse(v), t))
			));
			return true;
		}

		const tb_guid = new TextBox('BundleGUI ID', t.bundleGUI, ()=>{ t.bundleGUI=tb_guid.value.trim(); });
		const tb_sdkmac = new TextBox('Mac SDK version', t.macSdkVersion, ()=>{ t.macSdkVersion=tb_sdkmac.value.replaceAll(' ',''); });
		const tb_sdkios = new TextBox('IOS SDK version', t.iosSdkVersion, ()=>{ t.iosSdkVersion=tb_sdkios.value.replaceAll(' ',''); });
		const tb_teamid = new TextBox('Team ID', t.teamID, ()=>{ t.teamID=tb_teamid.value.trim(); });

		const f = new Form([
			new Button("Apply", ()=>{f.closeSignal=true;}),
			new Button("Reset", ()=>{
				t = resolveConfig({});
				tb_guid.value = t.bundleGUI;
				tb_sdkmac.value = t.macSdkVersion;
				tb_sdkios.value = t.iosSdkVersion;
				tb_teamid.value = t.teamID;
			}),
			...(await getSDKVersions()).map((x)=>new Label(x)),
			tb_guid,
			tb_sdkmac,
			tb_sdkios,
			tb_teamid
		]);
		await f.run();
		cachedKeys.set('xcode',JSON.stringify(resolveConfig(t)));
		return true;
	}
}
//xcodebuild -showsdks
listRequirement.push(xcode as Requirement<XCodeConfig>);
async function getSDKVersions ():Promise<string[]> {
	const cmd = Deno.run({
		cmd: ["xcodebuild", "-showsdks"], 
		stdout: "piped",
		stderr: "piped"
	});
	  
	const output = await cmd.output();

	cmd.close();

	const outStr = new TextDecoder().decode(output);
	const macSDKs:string[] = [];
	const iosSDKs:string[] = [];
	outStr.match(/macosx[0-9.]+/g)?.forEach((x)=>{
		const v = x.match(/[0-9.]+/g);
		if (v && v[0] && macSDKs.indexOf(v[0]) < 0)
			macSDKs.push(v[0]);
	});
	outStr.match(/iphoneos[0-9.]+/g)?.forEach((x)=>{
		const v = x.match(/[0-9.]+/g);
		if (v && v[0] && iosSDKs.indexOf(v[0]) < 0)
			iosSDKs.push(v[0]);
	});
	const tips:string[] = [];
	if (macSDKs.length>0)
		tips.push('Found MacOSX SDKs: '+macSDKs.map((x)=>' '+x).join(';'));
	if (iosSDKs.length>0)
		tips.push('Found IOS SDKs: '+iosSDKs.map((x)=>' '+x).join(';'));

	return tips;
}