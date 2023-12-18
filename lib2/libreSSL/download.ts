import { downloadLink } from '../download.ts';

export function download(version:string):Promise<string> {
	return downloadLink(`libreSSL-${version}`,`libreSSL/portable-${version}.tar.gz`,`https://codeload.github.com/libressl-portable/portable/tar.gz/refs/tags/v${version}`);
}