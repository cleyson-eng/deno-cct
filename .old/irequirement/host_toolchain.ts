import { listRequirement, Requirement } from '../base/interfaces.ts';
import { cachedKeys } from '../base/cache.ts';
import { Button, ComboBox, Form, Label } from '../base/cli.ts';
import { configureToolchain, Toolchain, validToolchain } from './auxi/toolchain.ts';


export interface CTCs {
	clang:Toolchain;
	clang_n:number;
	gcc:Toolchain;
	gcc_n:number;
}
const CTCs_defaults = new Map<string, Toolchain>([
	["clang",{
		c:'clang',
		cxx:'clang++',
	}],
	["gcc",{
		c:'gcc',
		cxx:'g++',
	}]
]);

function wrongOrderRange (...x:number[]) {
	if (x.find((y)=>isNaN(y)||y < 1 || y > x.length) != null)
		return true;
	const blist:boolean[] = [];
	while (blist.length < x.length) blist.push(false);
	x.forEach((y)=>{
		if (blist[y-1])
			return true;
		blist[y-1] = true;
	});
	return false;
} 
function CTCsFixDefaults (x:CTCs):CTCs {
	const CTCs_props = Array.from(CTCs_defaults.keys());
	CTCs_props.forEach((k)=>{
		//@ts-ignore do it work!
		if (typeof x[k] !== 'object' || x[k] == '') x[k] = CTCs_defaults.get(k);
	});
	//@ts-ignore do it work!
	if (wrongOrderRange(CTCs_props.map((k=>x[k+"_n"] as number))))
		//@ts-ignore do it work!
		CTCs_props.forEach((k,ki)=>x[k+'_n']=ki+1);
	return x;
}
function CTCsRaster(x:CTCs):Toolchain[] {
	const CTCs_props = Array.from(CTCs_defaults.keys());
	//@ts-ignore do it work!
	return CTCs_props.map((k)=>({v:x[k+"_n"],p:x[k]})).sort((a,b)=>a.v-b.v).map((x)=>x.p);
}

export const ctoolchain = {
	name:"host_toolchains",
	title:"Clang/GCC",
	require:async (pc?:boolean)=>{
		const s = cachedKeys.get("unix_compiler");
		let v:CTCs;
		if (s == null) v = {} as CTCs;
		else v = JSON.parse(s) as CTCs;
		const paths = CTCsRaster(CTCsFixDefaults(v as CTCs));
		if (pc!==true) {
			const check_paths = cachedKeys.get("unix_compiler_");
			const check_asms = cachedKeys.get("unix_compiler_valid");

			if (check_paths && check_asms) {
				const cache_paths = JSON.parse(check_paths) as Toolchain[];
				const cache_asms:boolean[] = [];
				for (let i = 0; i < check_asms.length; i ++)
					cache_asms.push(check_asms.charAt(i).toUpperCase()=='T');
				if (cache_paths.length == cache_asms.length)
					return cache_paths.filter((_,xi)=>cache_asms[xi]);
			}
		}
		console.log('hererrr');
		const test_asms:boolean[] = [];
		for (let i = 0; i < paths.length; i++)
			test_asms[i] = await validToolchain(paths[i]);

			console.log(test_asms);
		cachedKeys.set("unix_compiler_", JSON.stringify(paths));
		cachedKeys.set("unix_compiler_valid", test_asms.map((x)=>x?'T':'F').join(''));
		return paths.filter((_,xi)=>test_asms[xi]);
	},
	configure:async function (vc?:string) {
		const CTCs_props = Array.from(CTCs_defaults.keys());
		if (vc) {
			const vp = JSON.parse(vc);
			if (typeof vp != 'object' || Object.keys(vp).find((vpp)=>CTCs_props.find((k)=>k==vpp||k+'_n'==vpp)==null)!=null)
				return false;
			cachedKeys.set("unix_compiler", JSON.stringify(vp));
			return true;
		}
		const s = cachedKeys.get("unix_compiler");
		let v:CTCs;
		if (s == null) v = {} as CTCs;
		else v = JSON.parse(s) as CTCs;
		v = CTCsFixDefaults(v as CTCs);
		
		
		const vidx = CTCs_props.map((_,i)=>i+1);
		const cbis:ComboBox<number>[] = [];
		
		const f = new Form([
			new Label(this.title, true),
			new Button("Apply", ()=>{f.closeSignal=true;}),
			new Button("Reset", ()=>{
				CTCs_props.forEach((k, ki)=>{
					//@ts-ignore v[k]
					v[k] = ASMs_defaults[k];
					//@ts-ignore v[k+'_n']
					v[k+"_n"] = ki + 1;
					cbis[ki].value = ki + 1;
				});
			}),
		]);
		CTCs_props.forEach((k)=>{
			//@ts-ignore v[k]
			const bt = new Button(k+": "+JSON.stringify(v[k]),async ()=>{
				//@ts-ignore v[k]
				await configureToolchain(v[k]);
				//@ts-ignore v[k]
				bt.title = k+": "+JSON.stringify(v[k]);
			});
			const cbi = cbis.length;
			//@ts-ignore v[k+"_n"]
			const cb = new ComboBox<number>("priority "+k, vidx.map((i)=>({v:i,t:i+'°'})), v[k+"_n"] as number, ()=>{
				const izero = vidx.find((x)=>cbis.find((y)=>x==y.value)==null)
				
				if (izero == null)
					return;
				const i = cbis.findIndex((s,si)=>s.value == cb.value && si != cbi);
				if (i < 0) {
					cb.value = izero;
					return;
				}
				cbis[i].value = izero;
			});
			cbis.push(cb);

			f.elements.push (bt, cb);
		});
		await f.run();

		CTCs_props.forEach((k, i)=>{
			if (!isNaN(cbis[i].value))
				//@ts-ignore v[k+"_n"]
				v[k+"_n"] = cbis[i].value;
		});

		cachedKeys.set("unix_compiler", JSON.stringify(v));
		cachedKeys.delete("unix_compiler_");
		cachedKeys.delete("unix_compiler_valid");
		return true;
	}
}
listRequirement.push(ctoolchain as Requirement<Toolchain[]>);