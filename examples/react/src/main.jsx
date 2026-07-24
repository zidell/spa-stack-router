import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createStackRouter } from 'spa-stack-router';

function App() {
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
			<button onClick={() => router.push(`detail.${Date.now()}`)}>Open detail</button>
			<button onClick={() => router.pop()}>Back</button>

			{stack.length === 0 ? (
				<section>Home</section>
			) : (
				stack.map((route, index) => (
					<section key={`${route.segment}-${index}`} hidden={route !== top}>
						<h2>{route.screen}</h2>
						<pre>{route.value}</pre>
					</section>
				))
			)}
		</main>
	);
}

createRoot(document.querySelector('#root')).render(<App />);
