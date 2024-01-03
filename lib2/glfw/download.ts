

import { downloadLink } from '../download.ts';

export function download(version:string):Promise<string> {
	return downloadLink(`glfw-${version}`,`glfw-${version}.tar.gz`,`https://github.com/glfw/glfw/archive/refs/tags/${version}.tar.gz`);
}