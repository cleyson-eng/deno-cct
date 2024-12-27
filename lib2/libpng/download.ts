import { downloadLink } from '../download.ts';

export function download(version:string):Promise<string> {
	return downloadLink(`libpng-${version}`,`libpng-${version}.tar.gz`,`https://github.com/pnggroup/libpng/archive/refs/tags/v${version}.tar.gz`);
}