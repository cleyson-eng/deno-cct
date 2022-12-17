import { resolve, fromFileUrl } from 'https://deno.land/std@0.154.0/path/mod.ts';

const dir = fromFileUrl(new URL('.', import.meta.url));

Deno.writeTextFileSync(
	resolve(dir, '_.ts'),
	Array.from(
		Deno.readDirSync(dir)
	).filter((x)=>
		x.isFile &&
		x.name.length>4 &&
		!x.name.startsWith('_') &&
		x.name.endsWith('.ts')
	).map((x)=>`import './${x.name}';`).join('\n')
)