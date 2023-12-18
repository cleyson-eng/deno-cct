import * as afs from '../../util/agnosticFS.ts';
import {path as P} from '../../deps.ts';

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
export default class File {
	path = '';
	txt = '';
	constructor (p:string) {
		if (!afs.stat(p).isFile) {
			p = P.resolve(p, 'CMakeLists.txt')
		}
		this.path = p;
		this.txt = afs.readTextFile(p);
	}
	save() {
		afs.writeTextFile(this.path, this.txt, {ifdiff:true});
	}
	fixPIC () {
		this.txt = replaceOrAdd(
			this.txt,
			/\([\s]*CMAKE_POSITION_INDEPENDENT_CODE[\s]+[A-Za-z]+[\s]*\)/gi,
			'(CMAKE_POSITION_INDEPENDENT_CODE ON)',
			'set(CMAKE_POSITION_INDEPENDENT_CODE ON)'
		);
		return this;
	}
	fixCStandard (version:11|14|17|20|23 = 17) {
		this.txt = replaceOrAdd(
			this.txt,
			/\([\s]*CMAKE_C_STANDARD[\s]+[A-Za-z0-9]+[\s]*\)/gi,
			`(CMAKE_C_STANDARD ${version})`,
			`set(CMAKE_C_STANDARD ${version})`
		);
		this.txt = replaceOrAdd(
			this.txt,
			/\([\s]*CMAKE_C_STANDARD_REQUIRED[\s]+[A-Za-z]+[\s]*\)/gi,
			'(CMAKE_C_STANDARD_REQUIRED ON)',
			'set(CMAKE_C_STANDARD_REQUIRED ON)'
		);
		this.txt = replaceOrAdd(
			this.txt,
			/\([\s]*CMAKE_CXX_STANDARD[\s]+[A-Za-z0-9]+[\s]*\)/gi,
			`(CMAKE_CXX_STANDARD ${version})`,
			`set(CMAKE_CXX_STANDARD ${version})`
		);
		this.txt = replaceOrAdd(
			this.txt,
			/\([\s]*CMAKE_CXX_STANDARD_REQUIRED[\s]+[A-Za-z]+[\s]*\)/gi,
			'(CMAKE_CXX_STANDARD_REQUIRED ON)',
			'set(CMAKE_CXX_STANDARD_REQUIRED ON)'
		);
		return this;
	}
	banPrograms(oldAproach?:boolean) {
		if (oldAproach) {
			if (this.txt.indexOf('macro(add_executable x)') < 0)
				this.txt = `set(FAKE_CPP_PATH \${CMAKE_CURRENT_LIST_DIR}/fake.c)
macro(add_executable x)
  add_library(\${x} STATIC \${FAKE_CPP_PATH})
  #set_target_properties(\${x} PROPERTIES LINKER_LANGUAGE C)
  set_target_properties(\${x} PROPERTIES PREFIX "__ignore__")
endmacro()
`+this.txt;
			return this;
		}
		const banTargets:string[] = Array.from
			(this.txt.matchAll(/[\s]add_executable[\s]*\([\s]*([A-Za-z0-9\_]+)[^\)]*\)/gi))
			.map((x)=>x[1])
			.filter((x,xi,xarr)=>xarr.indexOf(x)==xi);
		this.banTargetRefs(...banTargets);
		return this;
	}
	banTargetRefs(...targets:string[]) {
		targets = targets.filter((x,xi,xarr)=>xarr.indexOf(x)==xi);
		this.txt = this.txt.replace(
			/[A-Za-z\_]+[\s]*\(([^\)]*)\)/g,
		(frag:string, value:string)=>{
			if (findTargetRef(value, ...targets))
				return '';
			return frag;
		});
		return this;
	}
	banInstalls() {
		this.txt = this.txt.replace(/install\([^\)]*\)/gi,'');
		return this;
	}
	custom(op:(txt:string)=>string) {
		this.txt = op(this.txt);
		return this
	}
}