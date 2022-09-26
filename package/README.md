## PackageMaker
### Package Options (set on build)
- types:
	- <span style="color:#c97">"prop"</span> must use one of <span style="color:gray;">possibleValues</span>.
	- <span style="color:#c97">"lib"</span> must use Package Notation, with one of <span style="color:gray;">possibleValues</span> as a [<span style="color:#494">link type</span>]<span><span style="color:gray;">package name</span> (filter).

#### Package Notation

- [<span style="color:#494">link type</span>]<span><span style="color:gray;">package name</span>[@<span style="color:gray;">version</span>[\/<span style="color:gray;">hash</span>]]
	- <span style="color:#494">Link type:</span>
		- <span style="color:gray">#</span>: static.
		- <span style="color:gray">!</span>: dynamic.

### Package options (PackageMaker.options):

- <span style="color:gray">name</span>:RequestType - properties:
	- <span style="color:gray">optional</span>?: turn nullable(undefined).
	- <span style="color:gray">defaultValue</span>?: (optional must be disabled) apply this value, if null.
	- <span style="color:gray">linkInvariant</span>?: "not very important", this makes the properte not be compared while search in already builtin variants (ignored in variant hash).
	- <span style="color:gray">type</span>:
		- <span style="color:#c97">"prop"</span> common propertie, need:
			- <span style="color:gray">possibleValues</span>: <span style="color:#c97">"x;y;z..."</span>
		- <span style="color:#c97">"lib"</span> to make reference to another package, with some restrictions:
			- <span style="color:gray">possibleValues</span>: <span style="color:#c97">"packname1;!packname2"</span>, <span style="color:#494">link type</span> or/and <span style="color:gray;">package name</span>.
			- <span style="color:gray">libPrefs</span> (<span style="color:#494">Map&lt;string, string&gt;</span>): works in same way as <span style="color:#c97">"prop"</span>s, look " reserved key(s)" for exceptions, but to filter packages by versions and options (OBS.: linkInvariant props cant be filtered).

#### Package options reserved key(s): "out-of-box"

- <span style="color:#c97">"link"</span>: if not declared or null (ifnullable), is implicitly both static and dynamic. properties must be:
```js
"optional":Any//as you want
"defaultValue":Any//as you want
"linkInvariant":true
"type":"prop"
"possibleValues":"static;dynamic"
```

#### LibPrefs package options reserved keys(s)

- <span style="color:#c97">"@"</span>: filter by version, samples:
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

- on instance <span style="color:gray;">isSourceTargetDependent</span> and <span style="color:gray;">options</span> is called to get meta data.
- (async) <span style="color:gray;">source</span> is called to download any necessary resource, while this, any verbose must use only <span style="color:gray;">postAsyncStatus</span>, to be async safe.
- (sync) <span style="color:gray;">build</span> is called to configure and compile, can output without restriction.
- (async) <span style="color:gray;">bin</span> is called to reorganize compiled binaries and generate meta data to be ready for use, no verbose here pls.
- any exception must be generated with <span style="color:gray;">stageThrow</span> to append util debug data.

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
	- <span style="color:gray;">package name</span>.ts: single class for all versions
	- <span style="color:gray;">package name</span>/<span style="color:gray;">any name</span>.ts: group versions in files per class.
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