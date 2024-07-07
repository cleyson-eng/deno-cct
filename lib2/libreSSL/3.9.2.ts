import { downloadLink } from '../download.ts';
import { compress } from '../../util/exec.ts';
import { path as P } from '../../deps.ts';
import { writeTextFile } from "../../util/agnosticFS.ts";
import { Lib } from "../_library.ts";
import { AFS } from "../../mod.ts";
import { KVFile } from "../../util/kvfile.ts";

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
	add_subdirectory("\${CMAKE_CURRENT_LIST_DIR}/libressl-3.9.2" "libreSSL" EXCLUDE_FROM_ALL)

	add_library(x_libreSSL INTERFACE EXCLUDE_FROM_ALL)
	target_link_libraries(x_libreSSL INTERFACE tls ssl crypto \${PLATFORM_LIBS})
	target_include_directories(x_libreSSL INTERFACE "\${CMAKE_CURRENT_LIST_DIR}/libressl-3.9.2/include")
	if (EMSCRIPTEN)
		target_link_options(x_libreSSL INTERFACE "-s USE_PTHREADS 1")
	endif()
endfunction()

__self_inc()

set(CMAKE_MODULE_PATH \${CMAKE_MODULE_PATH} "\${CMAKE_CURRENT_LIST_DIR}/find")
`;
const findtxt = `
set(OpenSSL_FOUND ON)
set(OPENSSL_INCLUDE_DIR "\${CMAKE_CURRENT_LIST_DIR}/../libressl-3.9.2/include")
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
	const zipcache = await downloadLink(`libreSSL-3.9.2`,`libreSSL/3.9.2.tar.gz`,`https://ftp.openbsd.org/pub/OpenBSD/LibreSSL/libressl-3.9.2.tar.gz`);
    const cmakeRoot = P.resolve(outRoot, 'libreSSL', 'libressl-3.9.2');
    if (!AFS.exists(cmakeRoot)) {
		const cmakeRootCache = P.resolve(zipcache+"-unzip", 'libressl-3.9.2');
		if (!AFS.exists(cmakeRootCache))
			await compress(zipcache, zipcache+"-unzip");
	
		AFS.copy(cmakeRootCache,cmakeRoot);
	}
	const kvfix = new KVFile(cmakeRoot);
	if (kvfix.get("fixes") == undefined) {
		writeTextFile(P.resolve(outRoot, 'libreSSL', 'inc.cmake'), inctxt, { ifdiff:true });
		writeTextFile(P.resolve(outRoot, 'libreSSL', 'find', 'FindOpenSSL.cmake'), findtxt, { ifdiff:true, mkdir:true });
		kvfix.set("fixes","ok");
		kvfix.dispose();
	}

	return {
		name:'libreSSL',
		version:'3.9.2',
		root:cmakeRoot
	};
}