import * as fs from 'fs';
import * as path from 'path';
import { Writable } from 'stream';

import * as utils from "./utils";
import { DaveLevel } from '../common/dave-level';
import { getAssetsDir } from '../common/file-utils';

const LEVEL_ADDRESS = 0x26e0a;

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
    for (let j = 0; j < 10; j++) {
        const filename = `level${j}.dat`;

        const fOut = fs.createWriteStream(path.join(getAssetsDir('levels/'), filename));
        try {
            for (let i = 0; i < DaveLevel.PATH_SIZE; i++) {
                levels[j].path[i] = await reader.readByte();
            }
            writeToStream(fOut, Buffer.from(levels[j].path));

            for (let i = 0; i < DaveLevel.TILES_SIZE; i++) {
                levels[j].tiles[i] = await reader.readByte();
            }
            writeToStream(fOut, levels[j].tiles);

            for (let i = 0; i < DaveLevel.PADDING_SIZE; i++) {
                levels[j].padding[i] = await reader.readByte();
            }
            writeToStream(fOut, levels[j].padding);

            console.log(`Saving ${filename} as level data`);
        } finally {
            fOut.close();
        }
    }

    return levels;
}

export async function main() {
    await extractData();
}

main();