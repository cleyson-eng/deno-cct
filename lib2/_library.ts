import { PA, BuildType } from '../util/target.ts';
import { path } from '../deps.ts';


/*recomended project structure:
	external/ (if this project is the main)
		{libname-version}/... (externals)
	mylibrary/ ("content of repo", all data/code here)
	include.cmake (receive external libraries, define defaults, include mylibrary Cmakelists...make this project reusable/includable)
	cmakelists.cmake (ide/DEV preferences)


external libraries structure:
	from source:
		{libname-version}/
			{repo...}
			.gitignore(repo)
			include.cmake(custom options go here)

	with binary:
		{libname-version}/
			include.cmake
				include if exist {platform-arch(-build-type)}
			{platform-arch(-build-type)}/
				{repo/include/binaries...}
				include.cmake

library Importer.ts file structure:
	?source(outputRoot:string, [options...])=>Lib
	?binary(outputRoot:string, cmakeops:CMakeCrossOps, buildtype:BuildType, [options...])=>Lib
*/

export class LibCompiled {
	pa:PA
	btype:BuildType
	debug:boolean
	inc:string[]
	bin:string[]
	defs:Record<string,any>;
	constructor (x:{
		pa:PA
		name:string,
		version?:string,
		btype:BuildType,
		inc?:string[],
		bin?:string[],
		defs?:Record<string,any>;
	}) {
		this.pa = x.pa;
		this.btype = x.btype;
		this.debug = x.btype == BuildType.DEBUG || x.btype == BuildType.DEBUG_COVERAGE;
		this.inc = x.inc?x.inc:[];
		this.bin = x.bin?x.bin:[];
		this.defs = x.defs?x.defs:{};
		this.defs['HASLIB_'+x.name] = 1;
	}
	reorderBin(...ops:({r:RegExp,t?:"inclusive"|"exclusive"})[]) {
		let o = this.bin as string[]; 
		const n = [] as string[];

		ops.forEach((op)=>{
			const reg = op.r;
			const exc = (op.t === "exclusive");

			o = o.filter((x)=>{
				const capture = exc != (reg.exec(x) !== null);
				if (capture) {
					n.push(x);
				}
				return !capture
			});
		})
		n.push(...o);
		this.bin = n;
		return this;
	}
	getBinDynamics() {
		return this.bin.filter((x)=>{
			const xext = path.extname(x);
			return [".dylib",".so",".dll"].find((x)=>x==xext) != undefined;
		});
	}
	getBinLinkables() {
		return this.bin.filter((x)=>{
			const xext = path.extname(x);
			return [".dll"].find((x)=>x==xext) == undefined;
		});
	}
	cmake(tname:string):string {
		let r = `add_library(${tname} INTERFACE ${this.getBinLinkables().map((x)=>JSON.stringify(x)).join(' ')})\n`;
		if (this.inc.length > 0)
			r += `target_include_directories(${tname} INTERFACE ${this.inc.map((x)=>JSON.stringify(x)).join(' ')})\n`;
		const linkables = this.getBinLinkables();
		if (linkables.length > 0)
			r += `target_link_libraries(${tname} INTERFACE ${linkables.map((x)=>JSON.stringify(x)).join(' ')})\n`;
		const dkeys = Object.keys(this.defs);
		if (dkeys.length > 0)
			r += `target_compile_definitions(${tname} INTERFACE ${dkeys.map((k)=>`${k}=${this.defs[k]}`).join(' ')})\n`;

		return r;
	}
	normalize() {
		this.inc = this.inc.filter((x, xi, xarr)=>xi==xarr.findIndex((sx)=>sx == x));
		this.bin = this.bin.filter((x, xi, xarr)=>xi==xarr.findIndex((sx)=>sx == x));
	}
}
export interface Lib {
	root:string
	name:string
	version:string

	precompiled?:LibCompiled
}