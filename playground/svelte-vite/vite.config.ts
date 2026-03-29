import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wte from 'whos-that-element/vite';

export default defineConfig({
	plugins: [wte({ editor: 'vscode' }), sveltekit()]
});
