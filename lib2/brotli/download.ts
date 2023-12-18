import { downloadLink } from '../download.ts';

export function download(version:string):Promise<string> {
	return downloadLink(`brotli-${version}`,`brotli-${version}.tar.gz`,`https://codeload.github.com/google/brotli/tar.gz/refs/tags/v${version}`);
}