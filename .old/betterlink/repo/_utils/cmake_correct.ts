function replaceOrAdd(txt:string, exp:RegExp, replace:string, add:string) {
	let cases = 0;
	txt = txt.replace(exp, ()=>{
		cases++;
		return replace;
	});
	if (cases > 0)
		return txt;
	return add+'\n'+txt;
}
export function fixPIC (txt:string):string {
	return replaceOrAdd(
		txt,
		/\([\s]*CMAKE_POSITION_INDEPENDENT_CODE[\s]+[A-Za-z]+[\s]*\)/gi,
		'(CMAKE_POSITION_INDEPENDENT_CODE ON)',
		'set(CMAKE_POSITION_INDEPENDENT_CODE ON)'
	);
}
export function fixCStandard (txt:string, version:11|14|17|20|23 = 17):string {
	txt = replaceOrAdd(
		txt,
		/\([\s]*CMAKE_C_STANDARD[\s]+[A-Za-z0-9]+[\s]*\)/gi,
		`(CMAKE_C_STANDARD ${version})`,
		`set(CMAKE_C_STANDARD ${version})`
	);
	txt = replaceOrAdd(
		txt,
		/\([\s]*CMAKE_C_STANDARD_REQUIRED[\s]+[A-Za-z]+[\s]*\)/gi,
		'(CMAKE_C_STANDARD_REQUIRED ON)',
		'set(CMAKE_C_STANDARD_REQUIRED ON)'
	);
	txt = replaceOrAdd(
		txt,
		/\([\s]*CMAKE_CXX_STANDARD[\s]+[A-Za-z0-9]+[\s]*\)/gi,
		`(CMAKE_CXX_STANDARD ${version})`,
		`set(CMAKE_CXX_STANDARD ${version})`
	);
	return replaceOrAdd(
		txt,
		/\([\s]*CMAKE_CXX_STANDARD_REQUIRED[\s]+[A-Za-z]+[\s]*\)/gi,
		'(CMAKE_CXX_STANDARD_REQUIRED ON)',
		'set(CMAKE_CXX_STANDARD_REQUIRED ON)'
	);
}
export function banPrograms(txt:string, oldAproach:boolean):string {
	if (oldAproach) {
		if (txt.indexOf('macro(add_executable x)') < 0) {
			return `set(FAKE_CPP_PATH \${CMAKE_CURRENT_LIST_DIR}/fake.c)
macro(add_executable x)
  add_library(\${x} STATIC \${FAKE_CPP_PATH})
  #set_target_properties(\${x} PROPERTIES LINKER_LANGUAGE C)
  set_target_properties(\${x} PROPERTIES PREFIX "__ignore__")
endmacro()
`+txt;
		}
		return txt;
	}
	const banTargets:string[] = Array.from
		(txt.matchAll(/[\s]add_executable[\s]*\([\s]*([A-Za-z0-9\_]+)[^\)]*\)/gi))
		.map((x)=>x[1])
		.filter((x,xi,xarr)=>xarr.indexOf(x)==xi);
	return banTargetRefs(txt, ...banTargets);
}
function findTargetRef(x:string, ...targets:string[]):boolean {
	return targets.find((t)=>{
		let i = 0;
		while (true) {
			i = x.indexOf(t, i);
			if (i < 0) break;
			if ((i > 0 && /[\s]/g.exec(x.charAt(i-1)) == undefined)||
			(i+t.length < x.length && /[\s]/g.exec(x.charAt(i+t.length)) == undefined)) {
				i += t.length;
				continue;
			}
			return true;
		}
		return false;
	})!=undefined;
}
export function banTargetRefs(txt:string, ...targets:string[]):string {
	targets = targets.filter((x,xi,xarr)=>xarr.indexOf(x)==xi);
	return txt.replace(
		/[A-Za-z\_]+[\s]*\(([^\)]*)\)/g,
	(frag:string, value:string)=>{
		if (findTargetRef(value, ...targets))
			return '';
		return frag;
	});
}
export function banInstalls(txt:string):string {
	return txt.replace(/install\([^\)]*\)/gi,'');
}