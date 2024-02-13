import * as Cache from '../../util/cache.ts';
import { Downloader } from '../../util/download.ts';
import * as AFS from '../../util/agnosticFS.ts';
import { path as P } from '../../deps.ts';
import { compress } from '../../util/exec.ts';

export interface VKNames {
	version:string
	vkName:string//version in github
	vkFile:string//folder/file name of downloaded content
	//volk...
	voName:string
	voFile:string
};
//1.3.268 
export const vulkanNames = new Map<string, VKNames>([
	["1.3.268",{
		version:"1.3.268",
		vkName:"vulkan-sdk-1.3.268.0",
		vkFile:"Vulkan-Headers-vulkan-sdk-1.3.268.0",
		voName:"vulkan-sdk-1.3.268.0",
		voFile:"volk-vulkan-sdk-1.3.268.0",
	}]
]);

export async function download(n:VKNames) {
	const vkCache = Cache.cache(`vk-${n.version}/vk.tar.gz`);
	const voCache = Cache.cache(`vk-${n.version}/vo.tar.gz`);

	const kv = Cache.kvf;
	if (kv.get(n.vkName) == null) {
		if (AFS.exists(`vk-${n.version}`))
			Deno.remove(`vk-${n.version}`, {recursive:true});
		const dm = new Downloader();
		await dm.wait({
			thrownOnReturnFail:true,
			logList:true,
			logProgress:true,
		},
			dm.download(`https://codeload.github.com/KhronosGroup/Vulkan-Headers/tar.gz/refs/tags/${n.vkName}`, vkCache, `vulkanHeaders`),
			dm.download(`https://codeload.github.com/zeux/volk/tar.gz/refs/tags/${n.voName}`, voCache, `volk`)
		)

		kv.set(n.vkName, "OK");
	}
}
export async function unzip(n:VKNames, outRoot:string) {
	const vkCache = Cache.cache(`vk-${n.version}/vk.tar.gz`);
	const voCache = Cache.cache(`vk-${n.version}/vo.tar.gz`);

	outRoot = P.resolve(outRoot, 'vulkan');
	if (!AFS.exists(P.resolve(outRoot, 'vulkan'))) {
		await compress(vkCache, outRoot);
		Deno.renameSync(P.resolve(outRoot, n.vkFile), P.resolve(outRoot, 'vulkan'))
	}
	if (!AFS.exists(P.resolve(outRoot, 'volk'))) {
		await compress(voCache, outRoot);
		Deno.renameSync(P.resolve(outRoot, n.voFile), P.resolve(outRoot, 'volk'))
	}
}