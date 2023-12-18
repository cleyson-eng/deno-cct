import { downloadLink } from '../download.ts';

export function download(version:string):Promise<string> {
	return downloadLink(`glm-${version}`,`glm-${version}.tar.gz`,`https://codeload.github.com/g-truc/glm/tar.gz/refs/tags/${version}`);
}