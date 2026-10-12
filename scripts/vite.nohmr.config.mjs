// Dev server for automated browser tests: the normal config with live reload off, so edits made by
// other sessions while a test runs don't reload the page under it. Started from .claude/launch.json
// ("site-test", port 5174).
import base from '../vite.config.js';

export default { ...base, server: { ...(base.server || {}), port: 5174, strictPort: true, hmr: false } };
