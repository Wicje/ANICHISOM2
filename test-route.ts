import { useFileStore } from './lib/stores/file.store.ts';
console.log(useFileStore.getState().resolveSmartRoute('image/png', 'test.png'));
