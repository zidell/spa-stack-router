# spa-stack-router

[한국어](README.ko.md)

[![npm version](https://img.shields.io/npm/v/spa-stack-router.svg)](https://www.npmjs.com/package/spa-stack-router)
[![CI](https://github.com/zidell/spa-stack-router/actions/workflows/pages.yml/badge.svg)](https://github.com/zidell/spa-stack-router/actions/workflows/pages.yml)
[![Codecov](https://codecov.io/gh/zidell/spa-stack-router/graph/badge.svg)](https://codecov.io/gh/zidell/spa-stack-router)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A tiny framework-agnostic stack router for SPAs.

Building a web app often means reconciling its routes with browser navigation: Back and Forward, as well as edge-swipe navigation on a phone. When they disagree, the experience stops feeling like an app. `spa-stack-router` keeps a screen stack in the URL—using hashes or the History API—so browser navigation and your app's routes move together.

[Live demo](https://zidell.github.io/spa-stack-router/)

![spa-stack-router demo](assets/demo.gif)

`spa-stack-router` models navigation like a native app: push a child screen, pop back to the previous screen, replace the current screen, or switch to another root stack. The stack is stored in the URL, so refresh, sharing, and the browser Back button keep working.

Use it when your SPA has app-like screen layers such as list -> detail -> modal, and you want those layers reflected in the URL without adopting a framework-specific router.

It does not render UI and it does not depend on React, Vue, Svelte, or any other framework. Import it from npm, subscribe to stack changes, and connect the stack to your own state model.

## Install

```sh
npm install spa-stack-router
```

## Quick Start

```js
import router from 'spa-stack-router';

router.init();

const unsubscribe = router.subscribe((stack) => {
	const top = stack.at(-1);
	render(top ?? { screen: 'home', value: '' });
});

router.push('detail.42');
router.push('modal.info');
router.pop();
unsubscribe();
```

The default mode is `history`, so a clean root starts at:

```text
https://example.com/
```

After `router.push('detail.42')`, the URL becomes:

```text
https://example.com/detail.42
```

## Route Segments

Each stack entry is one URL path segment.

```text
screen.value
```

By default, only the first `.` is treated as the delimiter. Everything after it remains one opaque value for your app to interpret.

```js
// URL: /folder.documents/viewer.abc.123
[
	{
		screen: 'folder',
		segment: 'folder.documents',
		value: 'documents'
	},
	{
		screen: 'viewer',
		segment: 'viewer.abc.123',
		value: 'abc.123'
	}
]
```

If there is no delimiter, `value` is an empty string.

```js
// Segment: settings
{
	screen: 'settings',
	segment: 'settings',
	value: ''
}
```

Use `delimiter` if another separator fits your app better.

```js
router.init({ delimiter: ':' });
router.push('viewer:abc.123');
```

## Create An Instance

The default export is a ready-made router instance. Use `createStackRouter()` when you want an isolated instance.

```js
import { createStackRouter } from 'spa-stack-router';

const router = createStackRouter({
	basePath: '/app'
});

router.init();
```

## API

### `createStackRouter(options?)`

Creates an isolated router instance.

```js
const router = createStackRouter({
	mode: 'history',
	delimiter: '.',
	escToBack: true,
	basePath: '',
	callback: (stack) => {},
	exposeGlobal: false
});
```

Options:

- `mode`: `'history'` or `'hashbang'`. Default: `'history'`.
- `delimiter`: separator between `screen` and `value`. Default: `'.'`.
- `escToBack`: call `pop()` when Escape is pressed. Default: `true`.
- `basePath`: path prefix for history mode, for example `/app`. Default: `''`.
- `callback`: called whenever the stack changes.
- `exposeGlobal`: `true` exposes the router as `window.routes`; a string exposes it under that window property.

### `router.init(options?)`

Reads the current URL into the stack and starts listening for browser navigation.

```js
router.init({ basePath: '/app' });
```

You can pass the same options here as `createStackRouter()`. This is useful when using the default export.

```js
import router from 'spa-stack-router';

router.init({
	mode: 'hashbang',
	delimiter: ':'
});
```

### `router.subscribe(callback)`

Subscribes to stack changes. The callback is called immediately with the current stack.

```js
const unsubscribe = router.subscribe((stack) => {
	setStack(stack);
});
```

### `router.push(segment)`

Pushes a child screen onto the current stack.

```js
router.push('detail.42');
```

### `router.pop()`

Moves back one screen using browser history.

```js
router.pop();
```

### `router.replace(segment)`

Replaces the current top screen without adding a new browser history entry.

```js
router.replace('detail.43');
```

### `router.navigate(segment, options?)`

Navigates to a segment using stack-aware behavior.

```js
router.navigate('detail.99');
router.navigate('/search');
router.navigate('/inbox/thread.42/message.7');
router.navigate('/inbox/thread.42/message.7', { rebuild: true });
```

Behavior:

- Relative segment, such as `'detail.99'`: pushes onto the current stack.
- Absolute segment, such as `'/search'`: replaces the whole stack.
- Existing screen name in the stack: replaces that screen level instead of duplicating it.
- `options.rebuild: true`: rebuilds an absolute target one segment at a time.

### `router.popTo(targetDepth, callback?)`

Pops back to a stack depth using browser history.

```js
router.popTo(0);
```

Depth is the number of active stack entries. A clean root URL has depth `0`, `/detail.42` has depth `1`, and `/list/detail.42` has depth `2`.

### `router.getStack()`

Returns the current parsed route stack.

```js
const stack = router.getStack();
```

### `router.getDepth()`

Returns the current stack depth.

```js
const depth = router.getDepth();
```

### `router.destroy()`

Removes event listeners installed by `init()`.

```js
router.destroy();
```

## History Mode

History mode is the default.

```js
const router = createStackRouter({
	mode: 'history',
	basePath: '/app'
});
```

URLs look like this:

```text
https://example.com/app/inbox/message.42
```

Your server must serve the SPA entry document for every route under `basePath`.

## Hashbang Mode

Hashbang mode stores the stack after `#!/`.

```js
const router = createStackRouter({
	mode: 'hashbang'
});
```

URLs look like this:

```text
https://example.com/#!/inbox/message.42
```

Hashbang mode is useful when your server cannot be configured for history fallback routes.

## Framework Usage

### React

```jsx
import { useEffect, useMemo, useState } from 'react';
import { createStackRouter } from 'spa-stack-router';

export function App() {
	const router = useMemo(() => createStackRouter(), []);
	const [stack, setStack] = useState([]);

	useEffect(() => {
		router.init();
		const unsubscribe = router.subscribe(setStack);
		return () => {
			unsubscribe();
			router.destroy();
		};
	}, [router]);

	const top = stack.at(-1);

	return (
		<main>
			<button onClick={() => router.push('detail.42')}>Open</button>
			<button onClick={() => router.pop()}>Back</button>

			{stack.length === 0 ? (
				<section>home</section>
			) : (
				stack.map((route, index) => (
					<section key={`${route.segment}-${index}`} hidden={route !== top}>
						{route.screen}: {route.value}
					</section>
				))
			)}
		</main>
	);
}
```

### Vue

```vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { createStackRouter } from 'spa-stack-router';

const router = createStackRouter();
const stack = ref([]);
let unsubscribe;

onMounted(() => {
	router.init();
	unsubscribe = router.subscribe((nextStack) => {
		stack.value = nextStack;
	});
});

onUnmounted(() => {
	unsubscribe?.();
	router.destroy();
});
</script>

<template>
	<main>
		<button @click="router.push('detail.42')">Open</button>
		<button @click="router.pop()">Back</button>

		<section v-if="stack.length === 0">home</section>
		<template v-else>
			<section
				v-for="(route, index) in stack"
				:key="`${route.segment}-${index}`"
				:hidden="route !== stack.at(-1)"
			>
				{{ route.screen }}: {{ route.value }}
			</section>
		</template>
	</main>
</template>
```

### Svelte

`router.subscribe` follows the same shape as a Svelte store.

```svelte
<script>
	import { createStackRouter } from 'spa-stack-router';

	const router = createStackRouter();
	router.init();
</script>

<button on:click={() => router.push('detail.42')}>Open</button>
<button on:click={() => router.pop()}>Back</button>

{#each $router as route}
	<section hidden={route !== $router[$router.length - 1]}>
		{route.screen}: {route.value}
	</section>
{:else}
	<section>home</section>
{/each}
```

### Vanilla JavaScript

```js
import { createStackRouter } from 'spa-stack-router';

const router = createStackRouter();
const app = document.querySelector('#app');

router.subscribe((stack) => {
	const top = stack.at(-1);
	app.innerHTML = stack.length
		? stack
				.map(
					(route, index) => `
						<section ${route !== top ? 'hidden' : ''}>
							${route.screen}: ${route.value}
						</section>
					`
				)
				.join('')
		: '<section>home</section>';
});

router.init();
```

## Demo

This repository includes a runnable SPA-style demo and framework examples.

```sh
npm run demo:dev
```

The demo shows a title bar, list screens, pushed detail screens, pushed modal screens, tab-style stack replacement, clean root URLs, and browser Back behavior.

## Development

```sh
npm install
npm run check
npm test
npm run build
```

Before publishing:

```sh
npm pack --dry-run
npm publish --access public
```

## License

MIT
