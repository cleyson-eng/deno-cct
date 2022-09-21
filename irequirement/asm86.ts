import { listRequirement, Requirement } from '../base/interfaces.ts';
import { cachedKeys } from '../base/cache.ts';
import { exec } from '../base/utils.ts';
import { Button, ComboBox, fileAssistent, Form, Label, TextBox } from '../base/cli.ts';
import { _format } from 'https://deno.land/std@0.129.0/path/_util.ts';

export interface ASMs {
	yasm:string;
	yasm_n:number;
	nasm:string;
	nasm_n:number;
}
const ASMs_props = ["yasm","nasm"]
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
function ASMsFixDefaults (x:ASMs):ASMs {
	ASMs_props.forEach((k)=>{
		//@ts-ignore do it work!
		if (typeof x[k] !== 'string' || x[k] == '') x[k] = k;
	});
	//@ts-ignore do it work!
	if (wrongOrderRange(ASMs_props.map((k=>x[k+"_n"] as number))))
		//@ts-ignore do it work!
		ASMs_props.forEach((k,ki)=>x[k+"_n"]=ki+1);
	return x;
}
function ASMsRaster(x:ASMs):string[] {
	//@ts-ignore do it work!
	return ASMs_props.map((k)=>({v:x[k+"_n"],p:x[k]})).sort((a,b)=>a.v-b.v).map((x)=>x.p);
}

export const cmake:Requirement<string[]> = {
	name:"asm86",
	title:"YASM/NASM",
	require:async (pc?:boolean)=>{
		const s = cachedKeys.get("asm86");
		let v:ASMs;
		if (s == null) v = {} as ASMs;
		else v = JSON.parse(s) as ASMs;
		const paths = ASMsRaster(ASMsFixDefaults(v as ASMs));
		if (pc!==true) {
			const check_paths = cachedKeys.get("asm86_");
			const check_asms = cachedKeys.get("asm86_valid");

			if (check_paths && check_asms) {
				const cache_paths = check_paths.split('\n');
				const cache_asms:boolean[] = [];
				for (let i = 0; i < check_asms.length; i ++)
					cache_asms.push(check_asms.charAt(i).toUpperCase()=='T');
				if (cache_paths.length == cache_asms.length)
					return cache_paths.filter((_,xi)=>cache_asms[xi]);
			}
		}

		const test_asms:boolean[] = [];
		for (let i = 0; i < paths.length; i++)
			test_asms[i] = (await exec(".", [paths[i], "--version"])).success

		cachedKeys.set("asm86_", paths.join('\n'));
		cachedKeys.set("asm86_valid", test_asms.map((x)=>x?'T':'F').join(''));
		return paths.filter((_,xi)=>test_asms[xi]);
	},
	configure:async function (vc?:string) {
		if (vc) {
			const vp = JSON.parse(vc);
			if (typeof vp != 'object' || Object.keys(vp).find((vpp)=>ASMs_props.find((k)=>k==vpp||k+'_n'==vpp)==null)!=null)
				return false;
			cachedKeys.set("asm86", JSON.stringify(vp));
			return true;
		}
		const s = cachedKeys.get("asm86");
		let v:ASMs;
		if (s == null) v = {} as ASMs;
		else v = JSON.parse(s) as ASMs;
		v = ASMsFixDefaults(v as ASMs);

		
		
		const tbis:TextBox[] = [];
		const vidx = ASMs_props.map((_,i)=>i+1);
		const cbis:ComboBox<number>[] = [];
		
		const f = new Form([
			new Label(this.title, true),
			new Button("Apply", ()=>{f.closeSignal=true;}),
			new Button("Reset", ()=>{
				ASMs_props.forEach((k, ki)=>{
					//@ts-ignore v[k]
					v[k] = k;
					tbis[ki].value = k;
					//@ts-ignore v[k+'_n']
					v[k+"_n"] = ki + 1;
					cbis[ki].value = ki + 1;
				});
			}),
		]);
		ASMs_props.forEach((k)=>{
			//@ts-ignore v[k]
			const tb = new TextBox("Path-"+k, v[k], ()=>{ v[k] = tb.value });
			const bt = new Button("...locate "+k,async ()=>{
				const res = await fileAssistent({});
				if (res.length > 0) {
					tb.value = res[0];
					//@ts-ignore v[k]
					v[k] = res[0];
				}
			});
			tbis.push(tb);
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

			f.elements.push (tb, bt, cb);
		});
		await f.run();

		cachedKeys.set("asm86", JSON.stringify(v));
		return true;
	}
}
listRequirement.push(cmake);