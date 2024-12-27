import { downloadLink } from '../download.ts';

export function download(version:string):Promise<string> {
	return downloadLink(`bzip2-${version}`,`bzip2-${version}.tar.gz`,`https://sourceware.org/pub/bzip2/bzip2-${version}.tar.gz`);
}