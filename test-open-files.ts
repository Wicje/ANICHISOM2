import { useWindowStore } from './lib/stores/window.store.ts';
useWindowStore.getState().openWindow('files', 'Files');
console.log(useWindowStore.getState().windows.map(w => w.appId));
