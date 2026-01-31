import express from 'express';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse --port argument
const portArg = process.argv.find((arg) => arg.startsWith('--port='));
const port = portArg ? parseInt(portArg.split('=')[1], 10) : 3000;

const app = express();

// Serve static files from public directory
app.use(express.static(resolve(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Pacman server running on http://localhost:${port}`);
});
