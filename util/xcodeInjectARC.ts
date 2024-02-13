


import { isDataView } from "https://deno.land/std@0.129.0/node/internal_binding/types.ts";
import { path } from "../deps.ts";
import * as AFS from "./agnosticFS.ts";


interface C1 {
	projname:string
	ids:string
}
export function xcodeInjectARC(baseFolder:string, projectNames:string[], arcEnabled:boolean) {
	console.log('running xcodeInjectARC correction...')
	AFS.search(baseFolder, (p, isfile) => {
		if (isfile && p.endsWith('.pbxproj')) {
			let txt = AFS.readTextFile(p);

			const pattern = new RegExp(/PBXNativeTarget\ *\"(?<projname>[A-z]*?)\"\ *\*\/\ *\=[\s\S]*?buildConfigurations[\s\=\(]*(?<ids>[^\)]*)/g);
			
			let bconfIds = [] as string[];
			let t:any|undefined;
			while(null != (t=pattern.exec(txt))) {
				const res = t.groups as C1;
				if (projectNames.find((x)=>x==res.projname)) {
					bconfIds.push(...res.ids.replace(/\/\*[\s\S]*?\*\//g,'').replace(/[\s\n\t]+/g,'').split(','));
				}
			}
			bconfIds = bconfIds.map((x)=>x.trim()).filter((x)=>x!="");
			if (bconfIds.length>0) {
				console.log(`find build IDs: "${bconfIds.join(', ')}"`);
				console.log('Applying to build config');
				txt = txt.replace(/(?<id>[A-Z0-9]{24})\s*(\/\*[\s\S]*?\*\/\s*)?\=\s*\{[\s\S]*?name/g,(x:string, cid:string)=>{
					cid = cid.trim();
					if (bconfIds.find((y)=>y==cid)) {
						console.log('+');
						let nx = x.replace(
							/CLANG_ENABLE_OBJC_ARC\s*\=\s*[A-Z]*\s*\;/g,
							`CLANG_ENABLE_OBJC_ARC = ${arcEnabled?'YES':'NO'};`
						);
						if (nx == x && x.indexOf('CLANG_ENABLE_OBJC_ARC') < 0) {
							nx = x.replace(
								/buildSettings\s*\=\s*\{/,
								`buildSettings = {\n\t\t\t\tCLANG_ENABLE_OBJC_ARC = ${arcEnabled?'YES':'NO'};`
							);
						}
						if (nx != x) {
							console.log('O');
							x = nx;
						}
					}
					return x;
				});
				AFS.writeTextFile(p, txt, {ifdiff:true});
			}
		}
		return true;
	});
}