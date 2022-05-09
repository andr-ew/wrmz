import { readdir, writeFile } from 'fs/promises';

try {
    const files = {};
    const dirs = await readdir('vid_frames');
    for (const [, dir] of dirs.entries()) {
        files[dir] = await readdir(`vid_frames/${dir}`);
    }
    await writeFile('ls_vid.json', JSON.stringify(files));
} catch (err) {
    console.error(err);
}
