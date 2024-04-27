import * as fs from 'fs';
import * as path from 'path';
import { Writable } from 'stream';

import * as utils from "./utils";
import { DaveLevel } from '../common/dave-level';
import { getAssetsDir } from '../common/file-utils';

const LEVEL_ADDRESS = 0x26e0a;
const TITLE_LEVEL_ADDRESS = 0x25ea4;

function writeToStream(stream: Writable, data: Buffer) {
    return new Promise<void>((resolve, reject) => {
        stream.write(data, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function extractData() {
    const levels: DaveLevel[] = [];
    for (let i = 0; i < 10; i++) {
        levels[i] = new DaveLevel();
    }

    using reader = utils.getExeReader(process.argv[2]);
    reader.seek(LEVEL_ADDRESS);
    await reader.open();
    const assetsDir = getAssetsDir('levels/');
    for (let j = 0; j < 10; j++) {
        const filename = `level${j}.dat`;

        const fOut = fs.createWriteStream(path.join(assetsDir, filename));
        try {
            for (let i = 0; i < DaveLevel.PATH_SIZE; i++) {
                levels[j].path[i] = await reader.readByte();
            }
            await writeToStream(fOut, Buffer.from(levels[j].path));

            for (let i = 0; i < DaveLevel.TILES_SIZE; i++) {
                levels[j].tiles[i] = await reader.readByte();
            }
            await writeToStream(fOut, levels[j].tiles);

            for (let i = 0; i < DaveLevel.PADDING_SIZE; i++) {
                levels[j].padding[i] = await reader.readByte();
            }
            await writeToStream(fOut, levels[j].padding);

            console.log(`Saving ${filename} as level data`);
        } finally {
            fOut.close();
        }
    }

    // The title level is special and contains only a 70-byte tile section.
    reader.seek(TITLE_LEVEL_ADDRESS);
    const filename = 'leveltitle.dat';
    const fOut = fs.createWriteStream(path.join(assetsDir, filename));
    try {
        const tiles = Buffer.alloc(DaveLevel.TITLE_TILES_SIZE);
        for (let i = 0; i < tiles.length; i++) {
            tiles[i] = await reader.readByte();
        }
        await writeToStream(fOut, tiles);
        console.log(`Saving ${filename} as level data`);
    } finally {
        fOut.close();
    }

    return levels;
}

export async function main() {
    await extractData();
}

main();