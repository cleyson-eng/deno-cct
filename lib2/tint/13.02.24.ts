import { path as P } from '../../deps.ts';
import { tint } from './tint@3ac85400b3b76e7dfd01119cd89e2f1f01e1eaa1.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import * as Cache from '../../util/cache.ts';
import { AFS } from "../../mod.ts";


const inctxt = `
function(__self_inc)
	
endfunction()
	option(TINT_IS_SUBPROJEC "as part of other project, no tests" ON)
	option(TINT_BUILD_SPV_READER "Build the SPIR-V input reader" ON)
	option(TINT_BUILD_WGSL_READER "Build the WGSL input reader" OFF)
	option(TINT_BUILD_HLSL_WRITER "Build the HLSL output writer" OFF)
	option(TINT_BUILD_MSL_WRITER "Build the MSL output writer" OFF)
	option(TINT_BUILD_SPV_WRITER "Build the SPIR-V output writer" OFF)
	option(TINT_BUILD_WGSL_WRITER "Build the WGSL output writer" ON)
	option(TINT_BUILD_GLSL_WRITER "Build GLSL writer" OFF)
	option(TINT_BUILD_IR "Build the IR" OFF)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/tint" "tint" EXCLUDE_FROM_ALL)

	add_library(x_tint INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_tint INTERFACE tint_api)
__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {

	await tint(Cache.cache('tint.13.02.24'), P.resolve(outRoot, 'tint', 'tint'));
	
	/*const linkSrc = P.resolve(outRoot, 'spirv-tools/src/abseil-cpp');
	const linkFile = P.resolve(outRoot, 'tint/tint/third_party/abseil-cpp');
	if (!AFS.exists(linkFile))
		Deno.symlinkSync(linkSrc, linkFile, {type:"dir"});*/

	writeTextFile(P.resolve(outRoot, 'tint', 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'tint',
		version:'13.02.2024',
		root:''
	};
}