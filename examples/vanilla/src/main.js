import { createStackRouter } from 'spa-stack-router';

const router = createStackRouter();
const app = document.querySelector('#app');

function render(stack) {
	const top = stack.at(-1);
	const screens = stack.length
		? stack
				.map(
					(route, index) => `
						<section ${route !== top ? 'hidden' : ''}>
							<h2>${route.screen}</h2>
							<pre>${route.value}</pre>
						</section>
					`
				)
				.join('')
		: '<section>Home</section>';

	app.innerHTML = `
		<button data-open>Open detail</button>
		<button data-back>Back</button>
		${screens}
	`;
	app.querySelector('[data-open]').addEventListener('click', () => {
		router.push(`detail.${Date.now()}`);
	});
	app.querySelector('[data-back]').addEventListener('click', () => {
		router.pop();
	});
}

router.subscribe(render);
router.init();
