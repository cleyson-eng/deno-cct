import { Button, Element, fileAssistent, Form, TextBox } from "../../base/cli.ts";
import { exec } from "../../base/utils.ts";

export interface Toolchain {
	c:string
	cxx:string
	ranlib?:string
	ar?:string
	strip?:string
	ld?:string
}
const props = ['c','cxx'];
export async function validToolchain (x:Toolchain):Promise<boolean> {
	for (let i = 0; i < props.length; i++) {
		//@ts-ignore string|null
		const p = x[props[i]];
		if (p && p!="" && !(await exec('.', [p, '--version'])).success) {
			console.log(`%cNot found: ${p}, broken toolchain`,'color: red;')
			return false;
		}
	}
	return true;
}
export async function configureToolchain (v:Toolchain) {
	const btvalid = new Button("Valid", async ()=>{
		console.log('...');
		btvalid.title = (await validToolchain(v))?'Valid (OK)':' Valid (Failed)';
	});
	const els:Element[]=[];
	props.forEach((x)=>{
		//@ts-ignore ignore
		const tb = new TextBox(x, v[x]?v[x]:'', ()=>{ v[x] = tb.value; });
		const bt = new Button("...locate "+x,async ()=>{
			const res = await fileAssistent({});
			if (res.length > 0) {
				tb.value = res[0];
				//@ts-ignore v[k]
				v[k] = res[0];
			}
		});
		els.push(tb,bt);
	})
	const f = new Form([
		new Button("Return", ()=>{f.closeSignal=true;}),
		btvalid,
		...els
	]);
	await f.run();
}