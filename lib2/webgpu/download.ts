import { downloadLink } from '../download.ts';

export function downloadLast():Promise<string> {
	return downloadLink(`webgpu`,`webgpu`,`https://github.com/juj/wasm_webgpu.git`);
}