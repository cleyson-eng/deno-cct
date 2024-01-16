import { download } from "./download.ts";
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { Inject } from "../utils.ts";
import { autogen } from "./autogen.ts";
import * as Cache from '../../util/cache.ts';
import { AFS } from "../../mod.ts";
import { KVFile } from "../../util/kvfile.ts";

const inctxt = `
include("\${CMAKE_CURRENT_LIST_DIR}/../compat.cmake")
function(__self_inc)
	set(LIBRESSL_SKIP_INSTALL ON)
	set(LIBRESSL_APPS OFF)
	set(LIBRESSL_TESTS OFF)
	set(ENABLE_EXTRATESTS OFF)
	set(ENABLE_NC OFF)
	set(USE_STATIC_MSVC_RUNTIMES OFF)
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/portable-3.5.2" "libreSSL")

	add_library(x_libreSSL INTERFACE)
	target_link_libraries(x_libreSSL INTERFACE tls ssl crypto \${PLATFORM_LIBS})
	target_include_directories(x_libreSSL INTERFACE "\${CMAKE_CURRENT_LIST_DIR}/portable-3.5.2/include")
	if (EMSCRIPTEN)
		target_link_options(x_libreSSL INTERFACE "-s USE_PTHREADS 1")
	endif()
endfunction()

__self_inc()
`;

export async function source(outRoot:string):Promise<Lib> {
	const cache = await download('3.5.2');
	const cmakeRoot = P.resolve(outRoot, 'libreSSL', 'portable-3.5.2');

	//<cached autogen>
	const cmakeRootCache = P.resolve(cache+"-3.5.2-dop", 'portable-3.5.2');
	const kv = Cache.kvf;
	if (kv.get("libreSSL-3.5.2-dop") == undefined) {
		if (AFS.exists(cache+"-3.5.2-dop"))
			Deno.removeSync(cache+"-3.5.2-dop", {recursive:true});
		await compress(cache, cache+"-3.5.2-dop");

		//await compress(cache, P.resolve(outRoot, 'libreSSL'));

		await autogen(cmakeRootCache);
		
		kv.set("libreSSL-3.5.2-dop", "ok");
	}
	//</cached autogen>


	if (!AFS.exists(cmakeRoot))
		AFS.copy(cmakeRootCache,cmakeRoot);
	const kvfix = new KVFile(cmakeRoot);
	if (kvfix.get("fixes") == undefined) {
		new Inject(P.resolve(cmakeRoot, 'crypto/compat/arc4random.h'))
		 .replace(/\#elif\ defined\(__linux__\)/g,"#elif defined(__EMSCRIPTEN__) || defined(__linux__)").save();
		new Inject(P.resolve(cmakeRoot, 'crypto/compat/arc4random.c'))
		 .before(FIXER_EMSCRIPTEN, '//>>emscripten-fix').save();
		new Inject(P.resolve(cmakeRoot, 'include/openssl/opensslconf.h'))
		 .before(FIXER_APPLE, '//>>apple-fix').save();
		new Inject(P.resolve(cmakeRoot, 'crypto/compat/recallocarray.c'))
		 .before(FIXER_APPLE, '//>>apple-fix').save();
		new Inject(P.resolve(cmakeRoot, 'crypto/compat/freezero.c'))
		 .before(FIXER_APPLE, '//>>apple-fix').save();

		const f = new Inject(P.resolve(cmakeRoot, 'CMakeLists.txt'));
		f.cmake_noInstalls()
		 .cmake_CStand(17)
		 .cmake_CXXStand(17)
		 .cmake_pic()
		 .replace(/option\(ENABLE_ASM\ \"Enable\ assembly\"\ OFF\)/g,"option(ENABLE_ASM \"Enable assembly\" OFF)")
		 .cmake_stripReferences("minigzip")
		 .cmake_stripReferences("example")
		 .cmake_stripReferences("minigzip64")
		 .cmake_stripReferences("example64")
		 .save();

		 writeTextFile(P.resolve(outRoot, 'libreSSL', 'inc.cmake'), inctxt, { ifdiff:true });
		 kvfix.set("fixes","ok");
		 kvfix.dispose();
	}

	return {
		name:'libreSSL',
		version:'3.5.2',
		root:cmakeRoot
	};
}

const FIXER_EMSCRIPTEN =
`#if defined(__EMSCRIPTEN__)
//fix bug of undefined size_t of new (2022) emsdk
#include <stdio.h>
#include <sys/random.h>
#endif
`;
const FIXER_APPLE =
`#if defined(__APPLE__) && !defined(FIX_BZERO)
#define FIX_BZERO 1
#include <stddef.h>
#define SYSLOG_DATA_INIT {0}
struct syslog_data {int x;};
void vsyslog_r(int x, ...) {}
inline void explicit_bzero (void* ptr, size_t len) {
  char* p = (char*)ptr;
  for (int i = 0; i < len; i++)
    p[i] = 0;
}
#endif
`;