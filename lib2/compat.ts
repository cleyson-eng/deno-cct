import { grantResource, CMAKE_COMPAT } from "../rsc/mod.ts";
import { path as P } from "../deps.ts";
import * as AFS from "../util/agnosticFS.ts";

export async function source(root:string) {
	const out = P.resolve(root, 'compat.cmake');
	const f = await grantResource(CMAKE_COMPAT);
	if (!AFS.exists(out)) {
		AFS.copy(f, out);
	}
}