import * as path from 'path';
import { Canvas, loadImage } from 'canvas';
import { video } from '@kmamal/sdl';

import { BinaryFileReader } from '../common/binary-file-reader';

import { DaveLevel } from '../common/dave-level';
import { renderToWindow } from '../common/render-utils';
import { getAssetsDir } from '../common/file-utils';

export function getExeReader(pathToFile?: string) {
    const p = pathToFile || 'original-game/DAVE.EXENEW';
    console.log("Reading executable from " + p);
    return new BinaryFileReader(p);
}

/** Test function that draws levels into a window. */
export async function displayMap(levels: DaveLevel[]) {
    const tiles: Canvas[] = [];
    for (let i = 0; i < 158; i++) {
        const img = await loadImage(path.join(getAssetsDir('tiles/'), `tile${i}.bmp`));
        const c = new Canvas(img.width, img.height);
        c.getContext("2d").drawImage(img, 0, 0);
        tiles.push(c);
    }

    const map = new Canvas(1600, 1600);
    const c = map.getContext("2d");
    for (let k = 0; k < 10; k++) {
        for (let j = 0; j < 10; j++) {
            for (let i = 0; i < 100; i++) {
                const tileIndex = levels[k].tiles[j * 100 + i];
                const dest = {
                    x: i * 16,
                    y: k * 160 + j * 16,
                    w: 16,
                    h: 16
                };
                c.drawImage(tiles[tileIndex], dest.x, dest.y, dest.w, dest.h);
            }
        }
    }

    const win = video.createWindow( { title: "World map(test)", width: 1600, height: 1600 });
    renderToWindow(win, map);
}