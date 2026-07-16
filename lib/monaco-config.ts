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

// Point the loader to the local monaco-editor package
loader.config({ monaco });

export default monaco;
