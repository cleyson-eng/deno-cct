import { extname } from "https://deno.land/std@0.154.0/path/mod.ts";
import * as afs from '../../base/agnosticFS.ts';
import { writeIfDiff } from "../../base/utils.ts";

// ?:buildype !:linktype, ' ':static/release
export enum RuntimeReplace {
	X_X = '?!',
	STATIC_X = '? ',
	STATIC_DEBUG = 'Debug ',
	STATIC_RELEASE = '  ',
	DYNAMIC_X = '?DLL',
	DYNAMIC_DEBUG = 'DebugDLL',
	DYNAMIC_RELEASE = ' DLL',
	X_DEBUG = 'Debug!',
	X_RELEASE = ' !',
}

export function castDynamicEver(x:RuntimeReplace):RuntimeReplace {
	let v = x as string;
	if (v.length>=2 && v[v.length-1] == ' ')
		v = v.substring(0, v.length-1)+'!';
	return v.replace('!', 'DLL') as RuntimeReplace;
}
export function replaceRuntimeProjects(path:string, rt:RuntimeReplace) {
	afs.search(path, (path:string, isFile:boolean)=>{
		if (isFile && extname(path) == ".vcxproj")
			writeIfDiff(path,
				afs.readTextFile(path)
				.replace(/\<RuntimeLibrary\>\s+?([A-Za-z]+)\s+\<\/RuntimeLibrary\>/g, (_,tc)=>`<RuntimeLibrary>MultiThreaded${
					rt.replace('?', tc.indexOf('Debug')>0?'Debug':'')
						.replace('!', tc.indexOf('DLL')>0?'DLL':'')
						.replaceAll(' ','')
				}</RuntimeLibrary>`)
			);
		return true;
	});
}