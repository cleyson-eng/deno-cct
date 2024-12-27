import { downloadLink } from '../download.ts';

export function download(version:string):Promise<string> {
	return downloadLink(`harfbuzz-${version}`,`harfbuzz-${version}.tar.gz`,`https://github.com/harfbuzz/harfbuzz/archive/refs/tags/${version}.tar.gz`);
}