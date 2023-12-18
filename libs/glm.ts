import * as D from './data.ts'
import { Downloader } from '../util/download.ts';
import { compress } from '../util/exec.ts';
import { path as P } from '../deps.ts';
import { BuildType } from '../util/target.ts';
import { LibraryMeta } from './LibraryMeta.ts';

export type Version = '0.9.9.8';


export async function main (version:Version):Promise<LibraryMeta> {
	const proot = D.projectRoot(`glm-${version}`);
	const srcLink = `https://codeload.github.com/g-truc/glm/tar.gz/refs/tags/${version}`;
	const zipFile = proot(D.Scope.GLOBAL, `cache/glm-${version}.tar.gz`);
	const srcRoot = proot(D.Scope.GLOBAL, `cache/glm-${version}`);
	
	//acquire source
	await D.kv(D.Scope.GLOBAL).legacy_markProgressAsync(`glm-${version}-download&unzip`, async ()=>{
		const dm = new Downloader();
		await dm.wait({
			thrownOnReturnFail:true,
			logList:true,
			logProgress:true,
		}, dm.download(srcLink, zipFile, 'glm'))

		await compress(zipFile, P.resolve(srcRoot,'..'));
	});

	return new LibraryMeta({
		pa:D.curTarget,
		name:`glm`,
		version,
		btype:BuildType.RELEASE_FAST,
		inc:[srcRoot],
	})
}