<script>
	import { createStackRouter } from 'spa-stack-router';

	const router = createStackRouter();
	router.init();
</script>

<main>
	<button on:click={() => router.push(`detail.${Date.now()}`)}>Open detail</button>
	<button on:click={() => router.pop()}>Back</button>

	{#each $router as route, index (route.segment + index)}
		<section hidden={index !== $router.length - 1}>
			<h2>{route.screen}</h2>
			<pre>{route.value}</pre>
		</section>
	{:else}
		<section>Home</section>
	{/each}
</main>
