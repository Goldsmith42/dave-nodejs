import * as fs from 'fs';
import * as path from 'path';
import { BmpEncoder } from "./bmp-encoder";

import { getExeReader } from './utils';
import { BMP_FORMAT } from '../common/render-utils';
import { getAssetsDir } from '../common/file-utils';

const VGA_DATA_ADDRESS = 0x120f0;
const VGA_PAL_ADDRESS = 0x26b0a;

async function extractData() {
    const outData = Buffer.alloc(150000);
    const palette: number[] = [];

    let finalLength: number;

    using reader = getExeReader(process.argv[2]);
    reader.seek(VGA_DATA_ADDRESS);
    await reader.open();
    finalLength = await reader.readDword();
    console.log("final length", finalLength);

    let currentLength = 0;
    while (currentLength < finalLength) {
        let byteBuffer = await reader.readByte();
        if (byteBuffer & 0x80) {
            byteBuffer &= 0x7f;
            byteBuffer++;
            while (byteBuffer) {
                outData[currentLength++] = await reader.readByte();
                byteBuffer--;
            }
        } else {
            byteBuffer += 3;
            const next = await reader.readByte();
            while (byteBuffer) {
                outData[currentLength++] = next;
                byteBuffer--;
            }
        }
    }

    // Read VGA palette
    reader.seek(VGA_PAL_ADDRESS);
    for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 3; j++) {
            palette[i * 3 + j] = await reader.readByte();
            palette[i * 3 + j] <<= 2;
        }
    }

    return { outData, finalLength, palette };
}

export async function main() {
    const { outData, finalLength, palette } = await extractData();

    const tileCount = outData.readUint32LE();
    console.log("tile count", tileCount);

    const tileIndex: number[] = [];
    for (let i = 0; i < tileCount; i++) {
        tileIndex.push(outData.readUInt32LE(i * 4 + 4));
        console.log(tileIndex[i]);
    }
    tileIndex.push(finalLength);

    for (let currentTile = 0; currentTile < tileCount; currentTile++) {
        let currentTileByte = 0;
        let currentByte = tileIndex[currentTile];

        let tileWidth = 16;
        let tileHeight = 16;

        if (currentByte > 0xff00) {
            currentByte++;
        }

        if (outData[currentByte + 1] == 0 && outData[currentByte + 3] == 0) {
            if (outData[currentByte] > 0 && outData[currentByte] < 0xbf && outData[currentByte + 2] > 0 && outData[currentByte + 2] < 0x64) {
                tileWidth = outData[currentByte];
                tileHeight = outData[currentByte + 2];
                currentByte += 4;
            }
        }

        const dstByte: number[] = [];
        for (; currentByte < tileIndex[currentTile + 1]; currentByte++) {
            const srcByte = outData[currentByte];
            const redP = palette[srcByte * 3];
            const greenP = palette[srcByte * 3 + 1];
            const blueP = palette[srcByte * 3 + 2];

            dstByte[currentTileByte * 4] = blueP;
            dstByte[currentTileByte * 4 + 1] = greenP;
            dstByte[currentTileByte * 4 + 2] = redP;
            dstByte[currentTileByte * 4 + 3] = 0xff;

            currentTileByte++;
        }

        const fOut = path.join(getAssetsDir('tiles/'), `tile${currentTile}.bmp`);
        console.log(`Saving ${fOut} as a bitmap (${tileWidth} x ${tileHeight})`);
        const data = new BmpEncoder({ data: Buffer.from(dstByte), height: tileHeight, width: tileWidth }, BMP_FORMAT).encode();
        fs.writeFileSync(fOut, data);
    }
}

main();