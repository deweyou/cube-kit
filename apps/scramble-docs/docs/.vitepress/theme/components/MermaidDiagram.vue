<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  code: string;
}>();

const renderedSvg = ref('');
const renderError = ref<string>();

const source = computed(() => decodeURIComponent(props.code));

const renderDiagram = async () => {
  if (typeof window === 'undefined') return;

  try {
    const mermaid = await import('mermaid');
    mermaid.default.initialize({
      securityLevel: 'strict',
      startOnLoad: false,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
    });

    const id = `mermaid-${crypto.randomUUID()}`;
    const { svg } = await mermaid.default.render(id, source.value);
    renderedSvg.value = svg;
    renderError.value = undefined;
  } catch (error) {
    renderedSvg.value = '';
    renderError.value = error instanceof Error ? error.message : String(error);
  }
};

onMounted(() => {
  void renderDiagram();
});

watch(source, () => {
  void renderDiagram();
});
</script>

<template>
  <figure class="mermaid-diagram">
    <div v-if="renderedSvg" class="mermaid-diagram__surface" v-html="renderedSvg" />
    <pre v-else class="mermaid-diagram__source"><code>{{ renderError ?? source }}</code></pre>
  </figure>
</template>
