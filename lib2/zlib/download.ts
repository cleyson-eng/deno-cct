import { downloadLink } from '../download.ts';

export function download(version:string):Promise<string> {
	return downloadLink(`zlib-${version}`,`zlib-${version}.tar.gz`,`https://www.zlib.net/fossils/zlib-${version}.tar.gz`);
}