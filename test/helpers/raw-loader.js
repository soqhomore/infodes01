// Register a custom loader that stubs Vite's ?raw imports for Node.js tests.
import { register } from 'node:module';

register(new URL('./raw-hooks.js', import.meta.url));
