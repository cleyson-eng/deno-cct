import { downloadLast } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { AFS } from "../../mod.ts";

const inctxt = `
if (EMSCRIPTEN)
	set(WGDIR "\${CMAKE_CURRENT_LIST_DIR}/wasm_webgpu/lib")

	add_library(x_webgpu STATIC "\${WGDIR}/lib_webgpu_cpp20.cpp")
	target_link_options(x_webgpu PUBLIC "SHELL:--js-library \${WGDIR}/lib_webgpu.js")
	target_include_directories(x_webgpu PUBLIC "\${WGDIR}")
	target_compile_definitions(x_webgpu INTERFACE X_WEBGPU=1)
else()
	add_library(x_webgpu INTERFACE)
endif()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await downloadLast();
	const cmakeRoot = P.resolve(outRoot, 'webgpu');

	if (!AFS.exists(cmakeRoot)) {
		AFS.copy(cache, cmakeRoot);
	}

	writeTextFile(P.resolve(cmakeRoot, 'inc.cmake'), inctxt, { ifdiff:true });

	return {
		name:'webgpu',
		version:'last',
		root:cmakeRoot
	};
}