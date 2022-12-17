import { PackageMaker } from "./package.ts";

interface PackageOrderAccel {
	packageMaker:PackageMaker
	deps:string[]
	dist:number[]
}

export class PackageMakerQueue {
	packs:PackageOrderAccel[];
	constructor (packs:PackageMaker[]) {
		this.packs = packs.map((x)=>{
			const deps:string[] = [];
			Object.keys(x.packOptions).forEach((k)=>{
				if (x.packOptions[k].type == 'lib' && x.packOptions[k].possibleValues) {
					deps.push(
						...(x.packOptions[k].possibleValues as string
						).split(';').map((x)=>x.replace(/[\!\#]/g,''))
					)
				}
			})
			return {
				packageMaker:x,
				deps,
				dist:[],
			};
		});
		this.packs = this.packs.sort((a,b)=>a.deps.length - b.deps.length)
		while (true) {
			let negative = true;
			for (let i = 0; i < this.packs.length && negative; i++) {
				if (this.packs[i].deps.length <= 0) continue;
				for (let i2 = i+1; i2 < this.packs.length && negative; i2++) {
					if (this.packs[i].deps.find((x)=>x==this.packs[i2].packageMaker.packName) != undefined) {
						const temp = this.packs[i];
						this.packs[i] = this.packs[i2];
						this.packs[i2] = temp;
						negative = false;
					}
				}
			}
			if (negative) break;
		}
		for (let i = 0; i < this.packs.length; i++) {
			this.packs[i].dist = this.packs[i].deps.map((k)=>{
				let i2 = 0;
				while (i2 < i && this.packs[i].packageMaker.packName != k) i2++;
				return i - i2;
			})
		}
	}
	getExecutableRange(init:number):number {
		let i = init + 1;
		while (i < this.packs.length) {
			const minDist = this.packs[i].dist.filter((x)=>x>0).sort()[0];
			if (minDist && minDist <= i - init) break;
			i++;
		}
		return i;
	}
	async runSourceAsync(init:number, end:number):Promise<PackageMaker[]> {
		if (init >= end) return [];
		console.log('...starting asynchronous get source...');
		let takes = 0;
		let completes = 0;
		const current = this.packs.slice(init, end).map((x)=>x.packageMaker);
		current.forEach((v)=>v._status = {p:0, t:"..."});

		async function solverThread () {
			while (true) {
				const myI = takes;
				takes++;
				if (myI >= current.length)
					break;
				await current[myI].ISouce();
				current[myI]._status = {p:1, t:"OK"};
				completes++;
				console.log(takes);
			}
		}
		for (let i = 0; i < current.length && i < 4; i++)
			solverThread();
		const loadingChars = ['▖','▘','▝','▗','▞','▚','▙','▛','▜','▟'];
		let loadingIndex = 0;
		while (completes < current.length) {
			await new Promise((resolve)=>setTimeout(resolve, 100));
			console.clear();
			console.log(loadingChars[loadingIndex]+` Acquiring resources...`);
			loadingIndex++;
			if (loadingIndex >= loadingChars.length) loadingIndex = 0;
			current.forEach((x)=>{
				let l = `${x.packName}@${x.packVersion}`;
				if (l.length > 24) {
					const iv = l.indexOf('@');
					l = l.substring(0, 23 - (l.length - iv))+'~'+l.substring(iv);
				}
				while (l.length < 25) l += ' ';
				if (x._status.p >= 0 && x._status.p <= 1)
					l += Math.round(x._status.p*100)+'% ';
				console.log(l+x._status.t);
			})
		}
		console.log('OK');
		return current;
	}
}