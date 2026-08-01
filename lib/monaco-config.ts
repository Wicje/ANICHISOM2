/**
 * Monaco Editor Configuration
 *
 * Configures @monaco-editor/react to use the locally installed monaco-editor
 * package instead of loading from CDN via AMD loader. This eliminates the
 * eval()/new Function() calls in the AMD loader, removing the need for
 * 'unsafe-eval' in CSP.
 *
 * Import this file before any Editor component renders.
 */

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure self.MonacoEnvironment for web workers under Vercel / Next.js static exports (Issue 63)
if (typeof window !== 'undefined') {
  (window as any).MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      if (label === 'json') return '/_next/static/chunks/json.worker.js';
      if (label === 'css' || label === 'scss' || label === 'less') return '/_next/static/chunks/css.worker.js';
      if (label === 'html' || label === 'handlebars' || label === 'razor') return '/_next/static/chunks/html.worker.js';
      if (label === 'typescript' || label === 'javascript') return '/_next/static/chunks/ts.worker.js';
      return '/_next/static/chunks/editor.worker.js';
    },
  };
}

// Point the loader to the local monaco-editor package
loader.config({ monaco });

export default monaco;
