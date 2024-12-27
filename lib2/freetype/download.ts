import { downloadLink } from '../download.ts';

export function download(version:string):Promise<string> {
	return downloadLink(`freetype-${version}`,`freetype-${version}.tar.gz`,`https://nongnu.askapache.com/freetype/freetype-${version}.tar.gz`);
}