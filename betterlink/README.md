# Better Link
Highly customizable package manager designed for the needs of C/C++ libraries, building from source code with not only version options, but too optimizations for modulation, platform/architecture and resources, that only a source build can get.

Cross-platform from the start: design to take advantage of deno-cct toolchains.
> __Note__
> Not designed to be the most ease package manager, but more customizable/optimizable (libraries), to reach this, as many libraries depend on another libraries with some conditions as versions limit, and libraries resource enabled/disabled, you must need manually import dependences in order to get max control about what capabilities each package has.

## Local Repo
This gona create a file $\color{lightblue}{"betterlink.json"} in your CWD to keep pseudo isolated local package repo (reality: all binaries from all "local repo" is stored in the cct cache folder), and a file $\color{lightblue}{"includes.json"} as common interface for other tools to create precompiled repositories and build system files.

## PackageMaker: Package script API
### Package Options (set on build)
- types:
	- $\color{lightblue}{"prop"}$ must use one of **possibleValues**.
	- $\color{lightblue}{"lib"}$ must use Package Notation, with one of **possibleValues** as a [ $\color{lightgreen}{link type}$ ]**package name** (filter).

#### Package Notation

- [ $\color{lightgreen}{link type}$ ]**package name**[\@**version**[\/**hash**]]
	- $\color{lightgreen}{Link type:}$
		- **#**: static.
		- **!**: dynamic.

### Package options (PackageMaker.options):

- **name**:RequestType - properties:
	- **optional**?: turn nullable(undefined).
	- **defaultValue**?: (optional must be disabled) apply this value, if null.
	- **linkInvariant**?: "not very important", this makes the properte not be compared while search in already builtin variants (ignored in variant hash).
	- **type**:
		- $\color{lightblue}{"prop"}$ common propertie, need:
			- **possibleValues**: $\color{lightblue}{"x;y;z..."}$
		- $\color{lightblue}{"lib"}$ to make reference to another package, with some restrictions:
			- **possibleValues**: $\color{lightblue}{"packname1;!packname2"}$, $\color{lightgreen}{link type}$ or/and **package name**.
			- **libPrefs** ( $\color{lightgreen}{Map(string, string)}$ ): works in same way as $\color{lightblue}{"prop"}$, look " reserved key(s)" for exceptions, but to filter packages by versions and options (OBS.: linkInvariant props cant be filtered).

#### Package options reserved key(s): "out-of-box"

- $\color{lightblue}{"link"}$ properties must be:
```js
"optional":Any//as you want
"defaultValue":Any//as you want
"linkInvariant":true
"type":"prop"
"possibleValues":"static;dynamic"
```
> __Note__ if not set, or propertie optional=true and get null as value, it implies in both static and dynamic (if supported).

#### LibPrefs package options reserved keys(s)

- $\color{lightblue}{"@"}$: filter by version, samples:
```js
"0.0.0"// version
"[0.0.0"// bigger inclusive(or equal)
"0.0.0["// bigger exclusive
"0.0.0]"// littler inclusive
"]0.0.0"// littler exclusive
"[0.0.0&0.0.0]"// range inclusive (& = and)
"0.0.0;[0.0.0&]0.0.0"// multiple valid ranges/values.... (; = or)
```

### Package Execution cycle (PackageMaker relative):

- (async) **source** is called to download any necessary resource, while this, any verbose must use only **postAsyncStatus**, to be async safe.
- (sync) **build** is called to configure and compile, can output without restriction.
- (async) **bin** is called to reorganize compiled binaries and generate meta data to be ready for use, no verbose here pls.

> __Note__ on start **isSourceTargetDependent** and **options** is called to get meta data.

> __Warning__ any exception must be generated with **stageThrow** to append util debug information.

### Package Cache File structure:

```
name@version/
	[<TARGET>/]src - source cache dir
	<TARGET>/<options hash>/
		build/
			OPTIONS.json - options of build
			[LINKS.json] - dependencies
		bin/
			[d|s]include/
			slib/
			dlib/
			sinc.json
			dinc.json
where TARGET is "platform-architecture"
```

### Package Repo Scripts structure:
- Two ways:
	- **package name**.ts: single class for all versions
	- **package name**/**any name**.ts: group versions in files per class.
```ts
export const VERSIONS = ['1.2.12','1.2.11'];
export const D = class extends PackageMaker {...to implement}
//optional filters exemples (use just one type per package):
// compatible only platform-arch:
//  <target>any-x32;any-x64...</target>
// no compatible only platform-arch:
//  <no-target>any-arm;any-arm64;win32-any</no-target>
//valid for the whole package too in a file per version group configuration (sum rules).
```