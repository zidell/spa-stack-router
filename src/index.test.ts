import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import routes, { createStackRouter, type RouteSegment } from './index';

function setUrl(url: string) {
	history.replaceState(null, '', url);
}

describe('createStackRouter', () => {
	const routers: ReturnType<typeof createStackRouter>[] = [];

	const makeRouter = (...args: Parameters<typeof createStackRouter>) => {
		const router = createStackRouter(...args);
		routers.push(router);
		return router;
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		setUrl('/');
	});

	afterEach(() => {
		for (const router of routers.splice(0)) router.destroy();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('parses the current hashbang URL on init', () => {
		setUrl('/#!/folder.docs/viewer.abc.123');
		const router = makeRouter({ mode: 'hashbang' });
		const seen: RouteSegment[][] = [];

		router.subscribe((stack) => seen.push(stack));
		router.init();

		expect(seen[0]).toEqual([]);
		expect(seen[1]).toEqual([
			{ screen: 'folder', segment: 'folder.docs', value: 'docs' },
			{ screen: 'viewer', segment: 'viewer.abc.123', value: 'abc.123' }
		]);
	});

	it('pushes, replaces, and reads hashbang stack entries', () => {
		const router = makeRouter({ mode: 'hashbang' });
		router.init();

		router.push('./folder.docs');
		router.push('viewer.abc');
		router.replace('viewer.def');

		expect(location.hash).toBe('#!/folder.docs/viewer.def');
		expect(router.getStack()).toEqual([
			{ screen: 'folder', segment: 'folder.docs', value: 'docs' },
			{ screen: 'viewer', segment: 'viewer.def', value: 'def' }
		]);
		expect(router.getDepth()).toBe(2);
	});

	it('uses a custom delimiter', () => {
		setUrl('/#!/folder:docs:2026');
		const router = makeRouter({ mode: 'hashbang', delimiter: ':' });
		router.init();

		expect(router.getStack()).toEqual([
			{ screen: 'folder', segment: 'folder:docs:2026', value: 'docs:2026' }
		]);
	});

	it('supports history mode with a base path', () => {
		setUrl('/app');
		const router = makeRouter({ mode: 'history', basePath: '/app' });
		router.init();

		router.push('folder.docs');
		router.push('viewer.abc');
		router.replace('viewer.def');

		expect(location.pathname).toBe('/app/folder.docs/viewer.def');
		expect(router.getStack().map((route) => route.segment)).toEqual(['folder.docs', 'viewer.def']);
	});

	it('parses history mode even when the current URL does not match basePath', () => {
		setUrl('/outside/folder.docs');
		const router = makeRouter({ mode: 'history', basePath: '/app' });
		router.init();

		expect(router.getStack().map((route) => route.segment)).toEqual(['outside', 'folder.docs']);
	});

	it('replaces an absolute target stack with navigate()', () => {
		const router = makeRouter({ mode: 'history', basePath: '/app' });
		router.init();

		router.push('folder.docs');
		router.navigate('/home/list/detail.99');

		expect(location.pathname).toBe('/app/home/list/detail.99');
		expect(router.getStack().map((route) => route.segment)).toEqual(['home', 'list', 'detail.99']);
	});

	it('pushes a relative target with navigate()', () => {
		const router = makeRouter({ mode: 'hashbang' });
		router.init();

		router.navigate('./detail.99');

		expect(location.hash).toBe('#!/detail.99');
	});

	it('replaces the top route when navigate() targets the current screen', () => {
		const router = makeRouter({ mode: 'hashbang' });
		router.init();

		router.push('detail.1');
		router.navigate('detail.2');

		expect(router.getStack().map((route) => route.segment)).toEqual(['detail.2']);
	});

	it('moves to an existing upper route before replacing it', () => {
		vi.useFakeTimers();
		const router = makeRouter({ mode: 'hashbang' });
		router.init();

		router.push('list.a');
		router.push('detail.1');
		router.navigate('list.b');
		vi.runAllTimers();

		expect(location.hash).toBe('#!/list.b');
	});

	it('rebuilds an absolute hierarchy step by step when requested', () => {
		vi.useFakeTimers();
		const router = makeRouter({ mode: 'hashbang' });
		router.init();

		router.navigate('/home/list/detail.99', { rebuild: true });
		vi.runAllTimers();

		expect(router.getStack().map((route) => route.segment)).toEqual(['home', 'list', 'detail.99']);
	});

	it('runs popTo timers and callback', () => {
		vi.useFakeTimers();
		const router = makeRouter({ mode: 'hashbang' });
		const callback = vi.fn();
		const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
		router.init();
		router.push('home');
		router.push('list');
		router.push('detail.1');

		router.popTo(0, callback);
		vi.runAllTimers();

		expect(backSpy).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('updates the stack from browser URL change events', () => {
		const router = makeRouter({ mode: 'hashbang' });
		router.init();

		location.hash = '#!/detail.1';
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		expect(router.getStack().map((route) => route.segment)).toEqual(['detail.1']);

		setUrl('/#!/detail.2');
		window.dispatchEvent(new PopStateEvent('popstate'));
		expect(router.getStack().map((route) => route.segment)).toEqual(['detail.2']);
	});

	it('re-reads the URL when init is called again', () => {
		const router = makeRouter({ mode: 'hashbang' });
		router.init();

		setUrl('/#!/detail.1');
		router.init();

		expect(router.getStack().map((route) => route.segment)).toEqual(['detail.1']);
	});

	it('calls callbacks and supports unsubscribe', () => {
		const callback = vi.fn();
		const subscriber = vi.fn();
		const router = makeRouter({ mode: 'hashbang', callback });
		router.init();

		const unsubscribe = router.subscribe(subscriber);
		router.push('detail.1');
		unsubscribe();
		router.push('detail.2');

		expect(callback).toHaveBeenCalled();
		expect(subscriber).toHaveBeenCalledTimes(2);
	});

	it('exposes a global router when requested', () => {
		const router = makeRouter({ mode: 'hashbang' });
		router.init({ exposeGlobal: 'appRoutes' });

		expect((window as unknown as { appRoutes: unknown }).appRoutes).toBe(router);

		const defaultRouter = makeRouter({ mode: 'hashbang' });
		defaultRouter.init({ exposeGlobal: true });

		expect((window as unknown as { routes: unknown }).routes).toBe(defaultRouter);
	});

	it('pops on Escape and removes listeners on destroy', () => {
		const router = makeRouter({ mode: 'hashbang' });
		const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
		router.init({ escToBack: true });
		router.push('detail.1');

		window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
		router.destroy();
		window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));

		expect(backSpy).toHaveBeenCalledTimes(1);
	});

	it('does not install Escape handling when disabled', () => {
		const router = makeRouter({ escToBack: false });
		const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
		router.init();
		router.push('detail.1');

		window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));

		expect(backSpy).not.toHaveBeenCalled();
	});

	it('does not pop an empty stack', () => {
		const router = makeRouter();
		const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
		router.init();

		router.pop();

		expect(backSpy).not.toHaveBeenCalled();
	});

	it('uses history mode by default', () => {
		const router = makeRouter();
		router.init();

		router.push('home');
		router.push('detail.1');

		expect(location.pathname).toBe('/home/detail.1');
		expect(location.hash).toBe('');
	});

	it('keeps an empty history stack at a clean root URL', () => {
		const router = makeRouter();
		router.init();

		router.navigate('/');

		expect(location.pathname).toBe('/');
		expect(location.hash).toBe('');
		expect(router.getStack()).toEqual([]);
	});

	it('keeps an empty hashbang stack without a hashbang marker', () => {
		setUrl('/#!/detail.1');
		const router = makeRouter({ mode: 'hashbang' });
		router.init();

		router.navigate('/');

		expect(location.pathname).toBe('/');
		expect(location.hash).toBe('');
		expect(router.getStack()).toEqual([]);
	});

	it('ignores invalid depth targets', () => {
		const router = makeRouter();
		router.init();
		router.push('detail.1');

		router.popTo(-2);
		router.popTo(1);

		expect(router.getStack().map((route) => route.segment)).toEqual(['detail.1']);
	});

	it('keeps the default export as a router instance', () => {
		expect(typeof routes.init).toBe('function');
		expect(typeof routes.subscribe).toBe('function');
	});
});
