import { listRequirement, Requirement } from '../base/interfaces.ts';
import { cachedKeys } from '../base/cache.ts';
import { Button, ComboBox, Form, Label, TextBox } from '../base/cli.ts';
import { castDynamicEver, RuntimeReplace } from './auxi/vcpp_runtime.ts';
import { extractEnumPairs } from '../base/utils.ts';

interface VCPPConfig {
	winRuntime:RuntimeReplace
	uwpVersion:string
	uwpRuntime:RuntimeReplace
}
const vdefault:VCPPConfig = {
	winRuntime:RuntimeReplace.STATIC_X,
	uwpVersion:"10.0",
	uwpRuntime:RuntimeReplace.DYNAMIC_X,
};
function resolveConfig(t2 :Partial<VCPPConfig>, v?:VCPPConfig):VCPPConfig {
	if (v == undefined)
		v = vdefault;
	return ({
		winRuntime:(t2.winRuntime != null?t2.winRuntime:v.winRuntime),
		uwpVersion:(t2.uwpVersion != null?t2.uwpVersion:v.uwpVersion),
		uwpRuntime:(t2.uwpRuntime != null?t2.uwpRuntime:v.uwpRuntime),
	});
}
export const vcpp = {
	name:"vc++",
	title:"Visual Studio C++",
	//deno-lint-ignore require-await
	require:async (pc?:boolean)=>{
		let t2:Partial<VCPPConfig>|undefined = undefined;
		if (pc) {
			cachedKeys.delete('vc++');
		} else {
			const t = cachedKeys.get('vc++');
			if (t) t2 = JSON.parse(t);
		}
		const r = resolveConfig(t2?t2:{});
		r.uwpVersion = castDynamicEver(r.uwpRuntime)
		return r;
	},
	configure:async function (v?:string) {
		const temp = cachedKeys.get('vc++');
		let t = resolveConfig(temp?JSON.parse(temp):{});
		if (v) {
			cachedKeys.set('vc++',JSON.stringify(
				resolveConfig(resolveConfig(JSON.parse(v), t))
			));
			return true;
		}

		const opts:{v:string, t:string}[] = extractEnumPairs<string>(RuntimeReplace);
		
		const cb_win = new ComboBox('Win-RuntimeReplace', opts, t.winRuntime, ()=>{ t.winRuntime=cb_win.value as RuntimeReplace; });
		const tb_sdk = new TextBox('Windows SDK (UWP)', t.uwpVersion, ()=>{ t.uwpVersion=tb_sdk.value.replaceAll(' ',''); });
		const cb_uwp = new ComboBox('UWP-RuntimeReplace', opts, t.uwpRuntime, ()=>{ t.uwpRuntime=cb_uwp.value as RuntimeReplace; });

		const f = new Form([
			new Button("Apply", ()=>{f.closeSignal=true;}),
			new Button("Reset", ()=>{
				t = resolveConfig({});
				cb_win.value = t.winRuntime;
				tb_sdk.value = t.uwpVersion;
				cb_uwp.value = t.uwpRuntime;
			}),
			...(await getSDKVersions()).map((x)=>new Label(x)),
			tb_sdk,
			cb_win,
			cb_uwp
		]);
		await f.run();
		cachedKeys.set('vc++',JSON.stringify(resolveConfig(t)));
		return true;
	}
}
listRequirement.push(vcpp as Requirement<VCPPConfig>);

function getSDKVersions ():string[] {
	let r:string[] = [];
	try {
		r = Array.from(Deno.readDirSync("C:\\Program Files (x86)\\Microsoft SDKs\\Windows Kits")).map((x)=>x.name);
	} catch (_) {
		try {
			r = Array.from(Deno.readDirSync("C:\\Program Files\\Microsoft SDKs\\Windows Kits")).map((x)=>x.name);
			//deno-lint-ignore no-empty
		} catch (_) {}
	}
	if (r.length > 0)
		return [`Found Windows SDKs: `+r.map((x)=>' '+x).join(';')];
	return [];
}

