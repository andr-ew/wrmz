import { readdir, writeFile } from 'fs/promises';

try {
    const files = await readdir('vid');
    await writeFile('ls_vid.json', JSON.stringify(files));
} catch (err) {
    console.error(err);
}
