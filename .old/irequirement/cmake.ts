import { listRequirement } from '../base/interfaces.ts';
import { cachedKeys } from '../base/cache.ts';
import { exec } from '../base/utils.ts';
import { Button, fileAssistent, Form, Label, TextBox } from '../base/cli.ts';

export const cmake = {
	name:"cmake",
	title:"CMake",
	require:async (pc?:boolean)=>{
		const cb = cachedKeys.get("cmake");
		let cbv = cachedKeys.get("cmake_");
		if (pc)
			cbv = undefined;
		if (cb) {
			if (cbv && cbv == cb)
				return cb;
			if ((await exec(".", [cb, "--version"])).success)
				cachedKeys.set("cmake_", cb);
				return cb;
		}
		if ((await exec(".", ["cmake", "--version"])).success) {
			cachedKeys.set("cmake", "cmake");
			cachedKeys.set("cmake_", "cmake");
			return "cmake";
		}
		return undefined;
	},
	configure:async function (v?:string) {
		if (v) {
			cachedKeys.set("cmake", v.length>0?v:'cmake');
			return true;
		}
		v = cachedKeys.get("cmake");
		const tb = new TextBox("Path", v?v:"cmake");
		const f = new Form([
			new Label(this.title, true),
			new Button("Apply", ()=>{f.closeSignal=true;}),
			new Button("Reset", ()=>{
				tb.value = "cmake";
			}),
			tb,
			new Button("...locate file",async ()=>{
				const res = await fileAssistent({});
				if (res.length > 0)
					tb.value = res[0];
			}),
		]);
		await f.run();
		cachedKeys.set("cmake", tb.value);
		return true;
	}
}
listRequirement.push(cmake);