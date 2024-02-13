import { path } from "../deps.ts";
import * as AFS from "./agnosticFS.ts";

/*
example:
 .../build/  <- baseFolder:".../build"
		main.vcxproj <- projectName:"main"
		main.vcxproj.filter
		assets <- assetFolder:"assets"(create symlinks if need)
*/
export function uwpInjectAssets(baseFolder:string, projectName:string, assetFolder:string) {
	const xp = path.resolve(baseFolder, projectName+".vcxproj");
	const xf = path.resolve(baseFolder, projectName+".vcxproj.filters");

	let assets = [] as string[];
	AFS.searchRelative(path.resolve(baseFolder, assetFolder), assetFolder, (_, p, isfile) => {
		if (isfile)
			assets.push(p)
		return true;
	});
	if (assets.length == 0) return;

	if (AFS.exists(xp))
		AFS.writeTextFile(xp, vcxproj(AFS.readTextFile(xp), assets), {ifdiff:true});
	if (AFS.exists(xf))
		AFS.writeTextFile(xf, vcxproj_filter(AFS.readTextFile(xf), assets), {ifdiff:true});
}
const STR_IGI = "<ItemGroup>";
const STR_IGE = "</ItemGroup>"
function itemGroupIterator(x:string, findstr:string, f:(i:string)=>string):string {
	let i = 0;
	while (true) {
		let s = x.indexOf(STR_IGI, i);
		if (s < i) break;
		s+= STR_IGI.length;
		const e = x.indexOf(STR_IGE, s);
		if (e < i) break;
		i = e + STR_IGE.length;
		const fsi = x.indexOf(findstr, s);
		if (fsi < s || fsi >= e)
			continue;
		return x.substring(0, s) + f(x.substring(s, e)) + x.substring(e);
	}
	return x;
}
function vcxproj (x:string, assets:string[]):string {
	return itemGroupIterator(
		x,
		"<Image Include=", (txt)=>{
			if (txt.indexOf(assets[0]) >= 0) return txt;
			return txt + assets.map((asset)=>
`    <None Include="${asset}">
      <DeploymentContent>true</DeploymentContent>
    </None>\n`).join("");
		}
	);
}
function vcxproj_filter (x:string, assets:string[]):string {
	return itemGroupIterator(
		x,
		"<Filter>Resource Files</Filter>", (txt)=>{
			if (txt.indexOf(assets[0]) >= 0) return txt;
			return txt + assets.map((asset)=>
`    <None Include="${asset}">
      <Filter>Resource Files</Filter>
    </None>\n`).join("");
		}
	);
}