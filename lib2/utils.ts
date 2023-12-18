import * as AFS from '../util/agnosticFS.ts';

type InAny = InjectEmpty|Inject;
export class InjectEmpty {
	path:string
	txt:string
	public constructor(p:string) { this.path = p; this.txt = AFS.readTextFile(p); }
	public save() { AFS.writeTextFile(this.path, this.txt, { ifdiff:true }); }

	public ifFind(flag:string ,continueE:boolean):InAny { return this; }
	public before(txt:string, label?:string):InAny { return this; }
	public after(txt:string, label?:string):InAny { return this; }
	public replace(exp:RegExp, replace:string, elseAction?:(t:InAny)=>void):InAny { return this; }

	public cmake_pic():InAny { return this; }
	public cmake_CStand(version:number):InAny { return this; }
	public cmake_CXXStand(version:number):InAny { return this; }
	public cmake_noInstalls():InAny { return this; }
	public cmake_noExecutables():InAny { return this; }
	public cmake_stripReferences(...targets:string[]):InAny { return this; }
}
export class Inject extends InjectEmpty {
	public ifFind(flag: string,continueE: boolean): InAny {
		if ((this.txt.indexOf(flag)>=0) != continueE)
			return new InjectEmpty(this.txt);
		return this;
	}
	public before(txt: string,label?: string): InAny {
		if (label != undefined) {
			if (this.txt.indexOf(label)>=0) return this;
			this.txt = `${label}\n${txt}\n${this.txt}`;
		} else this.txt = `${txt}\n${this.txt}`
		return this;
	}
	public after(txt: string,label?: string): InAny {
		if (label != undefined) {
			if (this.txt.indexOf(label)>=0) return this;
			this.txt += `\n${label}\n${txt}`;
		} else this.txt += txt
		return this;
	}
	public replace(exp:RegExp, replace:string, elseAction?:(t:InAny)=>void):InAny {
		let cases = 0;
		this.txt = this.txt.replace(exp, ()=>{
			cases++;
			return replace;
		});
		if (cases > 0 || elseAction == undefined)
			return this;
		elseAction(this);
		return this;
	}

	public cmake_pic():InAny {
		return this.replace(
			/\([\s]*CMAKE_POSITION_INDEPENDENT_CODE[\s]+[A-Za-z]+[\s]*\)/gi,
			'(CMAKE_POSITION_INDEPENDENT_CODE ON)',
			()=>this.before('set(CMAKE_POSITION_INDEPENDENT_CODE ON)')
		);
	}
	public cmake_CStand(version:number):InAny {
		return this.replace(
			/\([\s]*CMAKE_C_STANDARD[\s]+[A-Za-z0-9]+[\s]*\)/gi,
			`(CMAKE_C_STANDARD ${version})`,
			()=>this.before(`set(CMAKE_C_STANDARD ${version})`)
		).replace(
			/\([\s]*CMAKE_C_STANDARD_REQUIRED[\s]+[A-Za-z]+[\s]*\)/gi,
			'(CMAKE_C_STANDARD_REQUIRED ON)',
			()=>this.before('set(CMAKE_C_STANDARD_REQUIRED ON)')
		);
	}
	public cmake_CXXStand(version:number):InAny {
		return this.replace(
			/\([\s]*CMAKE_C_STANDARD[\s]+[A-Za-z0-9]+[\s]*\)/gi,
			`(CMAKE_CXX_STANDARD ${version})`,
			()=>this.before(`set(CMAKE_CXX_STANDARD ${version})`)
		).replace(
			/\([\s]*CMAKE_C_STANDARD_REQUIRED[\s]+[A-Za-z]+[\s]*\)/gi,
			'(CMAKE_CXX_STANDARD_REQUIRED ON)',
			()=>this.before('set(CMAKE_CXX_STANDARD_REQUIRED ON)')
		);
	}
	public cmake_noInstalls(): InAny {
		return this.replace(/install\([^\)]*\)/gi,'');
	}
	public cmake_noExecutables(): InAny {
		/*return this.before(`
macro(add_executable x)
	add_library(\${x} INTERFACE)
endmacro()`, '# fix no executables');*/
		return this;
	}
	public cmake_stripReferences(...targets: string[]): InAny {
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
}
function findTargetRef(txt:string, ...targets:string[]) {
	return targets.find((t)=>{
		let i = 0;
		while (true) {
			i = txt.indexOf(t, i);
			if (i < 0) break;
			if ((i > 0 && /[\s]/g.exec(txt.charAt(i-1)) == undefined)||
			(i+t.length < txt.length && /[\s]/g.exec(txt.charAt(i+t.length)) == undefined)) {
				i += t.length;
				continue;
			}
			return true;
		}
		return false;
	})!=undefined;
}