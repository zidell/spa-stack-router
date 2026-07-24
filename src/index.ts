export type RouterMode = 'hashbang' | 'history';

export interface RouteSegment {
	screen: string;
	segment: string;
	value: string;
}

export interface StackRouterOptions {
	/**
	 * `history` stores the stack in the pathname with History API.
	 * `hashbang` stores the stack in `#!/...`.
	 */
	mode?: RouterMode;
	/** Separator between screen and value inside one stack segment. */
	delimiter?: string;
	/** Called whenever the route stack changes. */
	callback?: (routes: RouteSegment[]) => void;
	/** Escape key triggers `pop()`. */
	escToBack?: boolean;
	/** Base path used by history mode, for example `/app`. */
	basePath?: string;
	/** Attach the router to `window.routes` for old script-style usage. */
	exposeGlobal?: boolean | string;
}

export interface NavigateOptions {
	/** Rebuild absolute targets one segment at a time. */
	rebuild?: boolean;
}

export interface StackRouter {
	subscribe: (subscriber: StackSubscriber) => () => void;
	init: (options?: StackRouterOptions) => void;
	destroy: () => void;
	push: (segment: string) => void;
	pop: () => void;
	replace: (segment: string) => void;
	popTo: (targetDepth: number, callback?: () => void) => void;
	navigate: (segment: string, options?: NavigateOptions) => void;
	getStack: () => RouteSegment[];
	getDepth: () => number;
}

type StackSubscriber = (routes: RouteSegment[]) => void;

const HASH_CHANGE_TIME_GAP = 5;

function normalizeBasePath(basePath: string): string {
	if (!basePath || basePath === '/') return '';
	return '/' + basePath.replace(/^\/+|\/+$/g, '');
}

function joinUrlPath(basePath: string, body: string): string {
	const base = normalizeBasePath(basePath);
	const suffix = body ? '/' + body : '';
	if (!base) return suffix || '/';
	return base + suffix;
}

function stripBasePath(pathname: string, basePath: string): string {
	const base = normalizeBasePath(basePath);
	if (!base) return pathname.replace(/^\/+/, '');
	if (pathname === base) return '';
	if (pathname.startsWith(base + '/')) return pathname.slice(base.length + 1);
	return pathname.replace(/^\/+/, '');
}

function stripRelativePrefix(segment: string): string {
	return segment.startsWith('./') ? segment.slice(2) : segment;
}

function parseRoutes(segments: string[], delimiter: string): RouteSegment[] {
	return segments.map((segment) => {
		const delimiterIndex = segment.indexOf(delimiter);
		const screen = delimiterIndex >= 0 ? segment.slice(0, delimiterIndex) : segment;
		const value = delimiterIndex >= 0 ? segment.slice(delimiterIndex + delimiter.length) : '';
		return {
			screen,
			segment,
			value
		};
	});
}

export function createStackRouter(initialOptions: StackRouterOptions = {}): StackRouter {
	const opts: Required<Omit<StackRouterOptions, 'callback' | 'exposeGlobal'>> & Pick<StackRouterOptions, 'callback' | 'exposeGlobal'> = {
		mode: 'history',
		delimiter: '.',
		callback: undefined,
		escToBack: true,
		basePath: '',
		exposeGlobal: false,
		...initialOptions
	};

	let routes: RouteSegment[] = [];
	let subscribers = new Set<StackSubscriber>();
	let initialized = false;
	let escHandler: ((event: KeyboardEvent) => void) | null = null;

	const notify = () => {
		for (const subscriber of subscribers) subscriber(routes);
		if (typeof opts.callback === 'function') opts.callback(routes);
	};

	const set = (nextRoutes: RouteSegment[]) => {
		routes = nextRoutes;
		notify();
	};

	const currentBody = () => {
		if (opts.mode === 'hashbang') {
			return location.hash.replace(/^#!?\/?/, '');
		}
		return stripBasePath(location.pathname, opts.basePath);
	};

	const parseCurrentUrl = () => {
		return currentBody().split('/').filter(Boolean);
	};

	const syncFromUrl = () => {
		set(parseRoutes(parseCurrentUrl(), opts.delimiter));
	};

	const writeUrl = (body: string, replace = false) => {
		const normalizedBody = body.split('/').filter(Boolean).join('/');
		const nextUrl = opts.mode === 'hashbang'
			? normalizedBody
				? `${location.pathname}${location.search}#!/${normalizedBody}`
				: `${location.pathname}${location.search}`
			: `${joinUrlPath(opts.basePath, normalizedBody)}${location.search}${location.hash}`;

		if (replace) history.replaceState(null, '', nextUrl);
		else history.pushState(null, '', nextUrl);

		syncFromUrl();
	};

	const appendSegment = (segment: string) => {
		const body = currentBody();
		writeUrl(body ? `${body}/${segment}` : segment);
	};

	const pop = () => {
		if (routes.length > 0) history.back();
	};

	const replace = (segment: string) => {
		const parent = routes.slice(0, -1).map((route) => route.segment);
		writeUrl([...parent, segment].join('/'), true);
	};

	const getDepth = () => routes.length;

	const popTo = (targetDepth: number, callback?: () => void) => {
		if (targetDepth < 0 || targetDepth >= routes.length) return;

		const gap = routes.length - targetDepth;
		for (let i = 0; i < gap; i += 1) {
			setTimeout(pop, i * HASH_CHANGE_TIME_GAP);
		}
		if (callback) setTimeout(callback, (gap + 1) * HASH_CHANGE_TIME_GAP);
	};

	const push = (segment: string) => {
		appendSegment(stripRelativePrefix(segment));
	};

	const navigate = (segment: string, options: NavigateOptions = {}) => {
		let target = stripRelativePrefix(segment);
		const currentIndex = routes.length - 1;
		const delimiterIndex = target.indexOf(opts.delimiter);
		const targetScreen = delimiterIndex >= 0 ? target.slice(0, delimiterIndex) : target;

		if (routes.length > 0) {
			const targetIndex = routes.findIndex((route) => route.screen === targetScreen);
			if (targetIndex >= 0) {
				if (targetIndex === currentIndex) replace(target);
				else writeUrl([...routes.slice(0, targetIndex).map((route) => route.segment), target].join('/'), true);
				return;
			}
		}

		if (!target.startsWith('/')) {
			push(target);
			return;
		}

		target = target.replace(/^\/+/, '');
		if (!options.rebuild) {
			writeUrl(target, true);
			return;
		}

		writeUrl('', true);
		target.split('/').filter(Boolean).forEach((segmentPart, idx) => {
			setTimeout(() => push(segmentPart), (idx + 1) * HASH_CHANGE_TIME_GAP);
		});
	};

	const onUrlChanged = () => {
		syncFromUrl();
	};

	const init = (options: StackRouterOptions = {}) => {
		Object.assign(opts, options);
		if (initialized) {
			syncFromUrl();
			return;
		}

		initialized = true;
		syncFromUrl();
		window.addEventListener('popstate', onUrlChanged);
		if (opts.mode === 'hashbang') window.addEventListener('hashchange', onUrlChanged);

		if (opts.escToBack) {
			escHandler = (event: KeyboardEvent) => {
				if (event.key === 'Escape') pop();
			};
			window.addEventListener('keyup', escHandler);
		}

		if (opts.exposeGlobal) {
			const key = typeof opts.exposeGlobal === 'string' ? opts.exposeGlobal : 'routes';
			(window as unknown as Record<string, StackRouter>)[key] = router;
		}
	};

	const destroy = () => {
		if (!initialized) return;
		initialized = false;
		window.removeEventListener('popstate', onUrlChanged);
		window.removeEventListener('hashchange', onUrlChanged);
		if (escHandler) window.removeEventListener('keyup', escHandler);
		escHandler = null;
	};

	const router: StackRouter = {
		subscribe(subscriber) {
			subscribers.add(subscriber);
			subscriber(routes);
			return () => {
				subscribers.delete(subscriber);
			};
		},
		init,
		destroy,
		push,
		pop,
		replace,
		popTo,
		navigate,
		getStack: () => routes,
		getDepth
	};

	return router;
}

const stackRouter = createStackRouter();

export default stackRouter;
