import { Button, ComboBox, Element, Form, Label, TextBox, TogleBox } from '../base/cli.ts';
import { BuildType, PA } from '../base/target.ts';
import { writeIfDiff } from '../base/utils.ts';
import * as p from './package.ts';
import { PackageMakerQueue } from './queue.ts';
import { cacheDir } from '../base/cache.ts'
import { resolve } from 'https://deno.land/std@0.154.0/path/mod.ts';
import { exists } from '../base/agnosticFS.ts';

interface OptionInterface{
	name:string
	tb_null?:TogleBox,
	cb_value:ComboBox<string>,
	tb_version?:TextBox,
}

export class CLIInterface {
	cache:string;
	target:PA;
	constructor (t:PA) {
		this.target = t;
		this.btfileLoad();
		this.cache = resolve(cacheDir,'r');
	}
	btfile = new Map<string, true>();
	btfileLoad() {
		Array.from(this.btfile.keys()).forEach((k)=>this.btfile.delete(k));
		if (!exists('./betterlink.json')) return;
		const raw = JSON.parse(Deno.readTextFileSync('./betterlink.json'))[Deno.build.target];
		if (raw == undefined) return;
		const traw = raw[`${this.target.platform}-${this.target.arch}`];
		if (traw == undefined) return;
		(traw as string[]).forEach((x:string)=>
			this.btfile.set(x, true)
		);
	}
	btfileSave() {
		const tstr = `${this.target.platform}-${this.target.arch}`;
		const traw:string[] = Array.from(this.btfile.keys()).filter((p)=>this.btfile.get(p));
		let base:Record<string, Record<string, string[]>> = {};
		if (!exists('./betterlink.json'))
			base = JSON.parse(Deno.readTextFileSync('./betterlink.json'));
		if (base[Deno.build.target] == undefined)
			base[Deno.build.target] = {};
		base[Deno.build.target][tstr] = traw;
		writeIfDiff('./betterlink.json', JSON.stringify(base));
	}
	async AddPackages(multipleVersion?:boolean) {
		const ND = 'N/D';
		//select desired packages...
		const uisl:Element[] = [];
		p.getPackageList(this.target).forEach((x)=>{
			const repeated = Array.from(this.btfile.keys()).filter((k)=>new p.PackageLink(k).name == x.name);
			const cb_sel = new ComboBox(x.name, [ND,...x.versions].map((x)=>({t:x,v:x})), ND);
			uisl.push(cb_sel);
			if (repeated.length > 0) {
				uisl.push(new Label('Already: '+repeated.join('; ')));
				if (multipleVersion !== true)
					cb_sel.enabled = false;
			}
		});
		const f = new Form([
			new Label("Add Package(s)",true),
			new Button("Continue", ()=>{f.closeSignal=true;}),
			...uisl
		]);
		await f.run();
		console.log('...loading')
		const incs = (await Promise.all((uisl as ComboBox<string>[]).filter((x)=>
			x.enabled && x.value && x.value != ND
		).map((x)=>p.loadPackage(x.title, x.value)))).filter((x)=>x!=undefined) as p.PackageClass[];
		if (incs.length == 0)
			return;
		const packages = incs.map((x)=>new x.clazz(this.target, x.name, x.version, this.cache));
		//reorder
		const queue = new PackageMakerQueue(packages);

		let i = 0;
		//source-build-bin cycles
		while (i < queue.packs.length) {
			const e = queue.getExecutableRange(i);
			//source
			await queue.runSourceAsync(i,e);
			
			//build
			const cpms:p.PackageMaker[] = [];
			for (;i < e;i++) {
				const cpm = queue.packs[i].packageMaker;
				await cpm.IBuild((await this.configurePack(cpm.packName, cpm.packOptions)), this.localFilter.bind(this));
				cpms.push(cpm);
			}
			//bin
			await Promise.all(cpms.map((x)=>x.IBin()));

			cpms.forEach((x)=>{
				const link = new p.PackageLink();
				link.name = x.packName;
				link.version = x.packVersion;
				link.hash = x.preferencesHash;
				this.btfile.set(link.toString(), true);
			});
			this.btfileSave();
		}
	}
	async configurePack(name:string, opts:Record<string, p.RequestType>):Promise<Record<string, string|BuildType|undefined>> {
		const uiopts:OptionInterface[] = [];
		Object.keys(opts).forEach((x)=>{
			const xv = opts[x] as p.RequestType;
			const tb_null = xv.optional?new TogleBox('Is null'):undefined;
			const values = xv.possibleValues.split(';');
			const cb_value = new ComboBox('Value', values.map((x)=>({t:x,v:x})), xv.defautValue?xv.defautValue:values[0]);
			const tb_version = xv.type == 'lib'?new TextBox('Version/hash', ''):undefined;
			uiopts.push({name:x, tb_null, cb_value, tb_version});
		})

		const ui:Element[] = [
			new Label(`Package "${name}" options:`)
		];
		uiopts.forEach((x)=>{
			ui.push(new Label(x.name, true));
			if (x.tb_null) ui.push(x.tb_null);
			ui.push(x.cb_value);
			if (x.tb_version) ui.push(x.tb_version);
		});
		
		const f = new Form([...ui,
			new Button("Confirm", ()=>{f.closeSignal=true;})
		]);
		await f.run();

		const r:Record<string, string|BuildType|undefined> = {};
		uiopts.forEach((x)=>{
			if (x.tb_null && x.tb_null.value)
				return;
			let v = x.cb_value.value;
			if (x.tb_version && x.tb_version.value.length > 0)
				v += '@'+x.tb_version;
			r[x.name] = v;
		})
		return r;
	}
	localFilter(nv:string,h?:string):boolean {
		const link = new p.PackageLink(nv);
		if (h) link.hash = h;
		const linkstr = link.toString();
		return Array.from(this.btfile.keys()).find((x)=>x.startsWith(linkstr)) != null;
	}
	async Main() {
		while (true) {
			const f = new Form([
				new Label('BetterLink!!! better performance',true),
				new Button('Add package(s)',async ()=>{
					await this.AddPackages();
					f.closeSignal = true;
				}),
				//new Button('Generate include.json'),
				new Label('your packages:'),
				...Array.from(this.btfile.keys()).map((k)=>new Button(k))
			]);
			await f.run();
		}
	}
}
