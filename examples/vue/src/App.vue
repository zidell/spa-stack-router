<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { createStackRouter } from 'spa-stack-router';

const router = createStackRouter();
const stack = ref([]);
const top = computed(() => stack.value.at(-1));
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
		<button @click="router.push(`detail.${Date.now()}`)">Open detail</button>
		<button @click="router.pop()">Back</button>

		<section v-if="stack.length === 0">Home</section>
		<template v-else>
			<section
				v-for="(route, index) in stack"
				:key="`${route.segment}-${index}`"
				:hidden="route !== top"
			>
				<h2>{{ route.screen }}</h2>
				<pre>{{ route.value }}</pre>
			</section>
		</template>
	</main>
</template>
