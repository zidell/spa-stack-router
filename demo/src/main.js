import { createStackRouter } from 'spa-stack-router';
import githubMarkUrl from './assets/github-mark.svg';
import './styles.css';

const router = createStackRouter({ basePath: import.meta.env.BASE_URL, delimiter: '.' });
const app = document.querySelector('#app');
let previousScreens = [];
let previousStack = [];
let leaveTimer = 0;

const tabs = [
	{ id: 'home', title: 'Today', label: 'Home' },
	{ id: 'search', title: 'Browse', label: 'Search' },
	{ id: 'settings', title: 'Settings', label: 'Settings' }
];

const lists = {
	home: [
		{ id: '101', title: 'Lorem ipsum dolor', meta: 'Consectetur' },
		{ id: '102', title: 'Amet commodo', meta: 'Vestibulum' },
		{ id: '103', title: 'Pharetra magna', meta: 'Integer' },
		{ id: '104', title: 'Nullam posuere', meta: 'Pellentesque' }
	],
	search: [
		{ id: '201', title: 'Aliquam luctus', meta: 'Maecenas' },
		{ id: '202', title: 'Donec pretium', meta: 'Curabitur' },
		{ id: '203', title: 'Vivamus porta', meta: 'Suspendisse' }
	],
	settings: [
		{ id: '301', title: 'Praesent varius', meta: 'Molestie' },
		{ id: '302', title: 'Etiam cursus', meta: 'Faucibus' },
		{ id: '303', title: 'Morbi sagittis', meta: 'Fermentum' }
	]
};

const lorem =
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Donec sed odio dui.';

const githubMark = '<img class="github-mark" src="' + githubMarkUrl + '" alt="" />';

function tabFromStack(stack) {
	const first = stack[0]?.screen;
	return tabs.some((tab) => tab.id === first) ? first : 'home';
}

function topRoute(stack) {
	return stack.at(-1) ?? { screen: 'home', segment: 'home', value: '' };
}

function routeTitle(route, stack) {
	if (stack.length === 0) return 'Today';
	if (stack.length === 1 && tabs.some((tab) => tab.id === route.screen)) {
		return tabs.find((tab) => tab.id === route.screen)?.title ?? 'Today';
	}

	if (route.screen === 'item') {
		const tab = tabFromStack(stack);
		const item = lists[tab]?.find((entry) => entry.id === route.value);
		return item?.title ?? 'Detail';
	}

	if (route.screen === 'profile') return 'Profile';
	if (route.screen === 'modal') return 'Modal';
	return route.screen;
}

function renderList(tabId) {
	const items = lists[tabId] ?? lists.home;

	return `
		<ul class="item-list">
			${items
				.map(
					(item) => `
						<li>
							<button class="row-button" data-action="push-item" data-id="${item.id}">
								<span>
									<strong>${item.title}</strong>
									<small>${item.meta}</small>
								</span>
								<span class="chevron" aria-hidden="true">›</span>
							</button>
						</li>
					`
				)
				.join('')}
		</ul>
	`;
}

function renderDetail(route, stack) {
	const tab = tabFromStack(stack);
	const item = lists[tab]?.find((entry) => entry.id === route.value);
	const depth = stack.length;

	return `
		<div class="detail">
			<p class="eyebrow">depth ${depth}</p>
			<h2>${item?.title ?? 'Detail'}</h2>
			<p>${lorem}</p>
			<div class="detail-actions">
				<button data-action="push-profile">Open profile</button>
				<button data-action="push-modal">Open modal</button>
				<button data-action="replace-item" data-id="${route.value || '900'}">Replace detail</button>
			</div>
		</div>
	`;
}

function renderProfile(stack) {
	return `
		<div class="detail">
			<p class="eyebrow">depth ${stack.length}</p>
			<h2>Profile</h2>
			<p>${lorem}</p>
			<div class="detail-actions">
				<button data-action="pop">Back</button>
				<button data-action="push-modal">Open modal</button>
				<button data-action="depth-root">Back to tab root</button>
			</div>
		</div>
	`;
}

function renderModal(stack) {
	return `
		<div class="modal-backdrop">
			<section class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
				<p class="eyebrow">depth ${stack.length}</p>
				<h2 id="modal-title">Modal</h2>
				<p>${lorem}</p>
				<div class="detail-actions">
					<button data-action="pop">Close</button>
					<button data-action="push-profile">Push profile</button>
				</div>
			</section>
		</div>
	`;
}

function screenKey(route, index) {
	return `${index}:${route.segment}`;
}

function buildScreens(stack) {
	const startsAtTabRoot = tabs.some((tab) => tab.id === stack[0]?.screen);
	return startsAtTabRoot ? stack : [{ screen: 'home', segment: 'home', value: '' }, ...stack];
}

function renderScreen(route, stack, index, screens, transition = '') {
	const isTop = index === screens.length - 1;
	const depth = index;
	const content =
		route.screen === 'item'
			? renderDetail(route, stack)
			: route.screen === 'profile'
				? renderProfile(stack)
				: route.screen === 'modal'
					? renderModal(stack)
					: renderList(route.screen);

	return `
		<section class="screen ${route.screen === 'modal' ? 'is-modal' : ''} ${isTop ? 'is-top' : ''} ${transition}" style="--depth: ${depth}">
			${content}
		</section>
	`;
}

function renderTabs(activeTab) {
	return tabs
		.map(
			(tab) => `
				<button class="tab ${tab.id === activeTab ? 'is-active' : ''}" data-action="tab" data-tab="${tab.id}">
					<span>${tab.label}</span>
				</button>
			`
		)
		.join('');
}

function renderDebug(stack) {
	return `
		<aside class="debug" aria-label="Route stack">
			<h2>Route stack</h2>
			<code>${location.pathname}</code>
			<pre>${JSON.stringify(stack, null, 2)}</pre>
		</aside>
	`;
}

function renderApp(stack, screens, leavingScreens = []) {
	const current = topRoute(stack);
	const activeTab = tabFromStack(stack);
	const title = routeTitle(current, stack);
	const canGoBack = stack.length > 0;

	app.innerHTML = `
		<main class="phone-shell">
			<div class="phone">
				<header class="titlebar">
					<button class="icon-button" data-action="pop" ${canGoBack ? '' : 'disabled'} aria-label="Back">
						‹
					</button>
					<div>
						<p>spa-stack-router</p>
						<h1>${title}</h1>
					</div>
					<a class="icon-link" href="https://github.com/zidell/spa-stack-router" target="_blank" rel="noreferrer" aria-label="View source on GitHub">${githubMark}</a>
				</header>

				<div class="screen-stage">
					${screens
						.map((route, index) => {
							const isEntering =
								previousScreens.length > 0 &&
								index === screens.length - 1 &&
								!previousScreens.some((previousRoute, previousIndex) => screenKey(previousRoute, previousIndex) === screenKey(route, index));
							return renderScreen(route, stack, index, screens, isEntering ? 'is-entering' : '');
						})
						.join('')}
					${leavingScreens
						.map((route, index) => {
							const leavingStack = previousStack.length ? previousStack : stack;
							return renderScreen(route, leavingStack, screens.length + index, [...screens, route], 'is-leaving');
						})
						.join('')}
				</div>

				<nav class="tabbar" aria-label="Tabs">
					${renderTabs(activeTab)}
				</nav>
			</div>

			${renderDebug(stack)}
		</main>
		<a class="source-link" href="https://github.com/zidell/spa-stack-router" target="_blank" rel="noreferrer">
			${githubMark}
			<span>GitHub에서 소스 보기</span>
		</a>
	`;
}

function render(stack) {
	const screens = buildScreens(stack);
	const nextKeys = new Set(screens.map(screenKey));
	const leavingScreens = previousScreens.filter((route, index) => !nextKeys.has(screenKey(route, index)));

	if (leaveTimer) window.clearTimeout(leaveTimer);
	renderApp(stack, screens, leavingScreens);

	previousScreens = screens;
	previousStack = stack;

	if (leavingScreens.length > 0) {
		leaveTimer = window.setTimeout(() => renderApp(stack, screens), 190);
	}
}

app.addEventListener('click', (event) => {
	const target = event.target.closest('[data-action]');
	if (!target) return;

	switch (target.dataset.action) {
		case 'tab':
			router.navigate(target.dataset.tab === 'home' ? '/' : `/${target.dataset.tab}`);
			break;
		case 'push-item':
			router.push(`item.${target.dataset.id}`);
			break;
		case 'replace-item':
			router.replace(`item.${Number(target.dataset.id ?? 900) + 1}`);
			break;
		case 'push-profile':
			router.push('profile.current');
			break;
		case 'push-modal':
			router.push('modal.info');
			break;
		case 'depth-root':
			{
				const activeTab = tabFromStack(router.getStack());
				router.navigate(activeTab === 'home' ? '/' : `/${activeTab}`);
			}
			break;
		case 'pop':
			router.pop();
			break;
	}
});

router.subscribe(render);
router.init();
