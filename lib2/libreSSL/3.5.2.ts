import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { autogen } from "./autogen.ts";
import * as Cache from '../../util/cache.ts';
import { AFS } from "../../mod.ts";
import { KVFile } from "../../util/kvfile.ts";
import { gitApply } from "../../util/git.ts";
import { grantResource } from "../../rsc/mod.ts";

const inctxt = `
include("\${CMAKE_CURRENT_LIST_DIR}/../compat.cmake")
function(__self_inc)
	option(LIBRESSL_SKIP_INSTALL "" ON)
	option(LIBRESSL_APPS "" OFF)
	option(LIBRESSL_TESTS "" OFF)
	option(ENABLE_EXTRATESTS "" OFF)
	option(ENABLE_NC "" OFF)
	option(USE_STATIC_MSVC_RUNTIMES "" OFF)
	#if(NOT CCT_TARGET_PLATFORM STREQUAL "win32")
		option(ENABLE_ASM "" OFF)
	#endif()
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/portable-3.5.2" "libreSSL" EXCLUDE_FROM_ALL)

	add_library(x_libreSSL INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_libreSSL INTERFACE tls ssl crypto \${PLATFORM_LIBS})
	target_include_directories(x_libreSSL INTERFACE "\${CMAKE_CURRENT_LIST_DIR}/portable-3.5.2/include")
	if (EMSCRIPTEN)
		target_link_options(x_libreSSL INTERFACE "-s USE_PTHREADS 1")
	endif()
endfunction()

__self_inc()

set(CMAKE_MODULE_PATH \${CMAKE_MODULE_PATH} "\${CMAKE_CURRENT_LIST_DIR}/find")
`;
const findtxt = `
set(OpenSSL_FOUND ON)
set(OPENSSL_INCLUDE_DIR "\${CMAKE_CURRENT_LIST_DIR}/../portable-3.5.2/include")
set(OPENSSL_CRYPTO_LIBRARY crypto)
set(OPENSSL_SSL_LIBRARY ssl)

if (NOT TARGET OpenSSL::Crypto)
	add_library(OpenSSL::Crypto ALIAS crypto)
	target_include_directories(crypto INTERFACE "\${OPENSSL_INCLUDE_DIR}")
endif()
if (NOT TARGET OpenSSL::SSL)
	add_library(OpenSSL::SSL ALIAS ssl)
	target_include_directories(ssl INTERFACE "\${OPENSSL_INCLUDE_DIR}")
endif()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('3.5.2');
	const cmakeRoot = P.resolve(outRoot, 'libreSSL', 'portable-3.5.2');

	if (!AFS.exists(cmakeRoot)) {
		//<cached autogen>
		const cmakeRootCache = P.resolve(cache+"-3.5.2-dop", 'portable-3.5.2');
		const kv = Cache.kvf;
		if (kv.get("libreSSL-3.5.2-dop") == undefined) {
			if (AFS.exists(cache+"-3.5.2-dop"))
				Deno.removeSync(cache+"-3.5.2-dop", {recursive:true});
			await compress(cache, cache+"-3.5.2-dop");
			await autogen(cmakeRootCache);
			
			kv.set("libreSSL-3.5.2-dop", "ok");
		}
		//</cached autogen>
	
		AFS.copy(cmakeRootCache,cmakeRoot);
	}
	const kvfix = new KVFile(cmakeRoot);
	if (kvfix.get("fixes") == undefined) {
		//returning -1 but works...
		if (!await gitApply(P.resolve(outRoot, 'libreSSL'), await grantResource('lib2/libreSSL/3.5.2.patch')))
			throw '';

		writeTextFile(P.resolve(outRoot, 'libreSSL', 'inc.cmake'), inctxt, { ifdiff:true });
		writeTextFile(P.resolve(outRoot, 'libreSSL', 'find', 'FindOpenSSL.cmake'), findtxt, { ifdiff:true, mkdir:true });
		kvfix.set("fixes","ok");
		kvfix.dispose();
	}

	return {
		name:'libreSSL',
		version:'3.5.2',
		root:cmakeRoot
	};
}