// Based on https://github.com/shaozilee/bmp-js/blob/master/lib/encoder.js
// Added the capability to specify a BMP format type.

export type Channel = 'r' | 'g' | 'b' | 'a';
type Format = [Channel, Channel, Channel, Channel] | `${Channel}${Channel}${Channel}${Channel}`;

export class BmpEncoder {
    private readonly buffer: Buffer;
    private readonly width: number;
    private readonly height: number;

    private readonly extraBytes: number;
    private readonly rgbSize: number;
    private readonly headerInfoSize: number;

    private readonly flag: "BM";
    private readonly reserved: number;
    private readonly offset: number;
    private readonly fileSize: number;
    private readonly planes: number;
    private readonly bitPP: number;
    private readonly compress: number;
    private readonly hr: number;
    private readonly vr: number;
    private readonly colors: number;
    private readonly importantColors: number;

    private pos: number = 0;

    private static isFormatValid(format: Format) {
        return new Set(format).size === 4;
    }

    public constructor(imgData: { data: Buffer, width: number, height: number }, private readonly format: Format) {
        if (!BmpEncoder.isFormatValid(format)) {
            throw new Error("Invalid format: " + format);
        }

        this.buffer = imgData.data;
        this.width = imgData.width;
        this.height = imgData.height;
        this.extraBytes = this.width % 4;
        this.rgbSize = this.height * (3 * this.width + this.extraBytes);
        this.headerInfoSize = 40;

        this.flag = "BM";
        this.reserved = 0;
        this.offset = 54;
        this.fileSize = this.rgbSize + this.offset;
        this.planes = 1;
        this.bitPP = 24;
        this.compress = 0;
        this.hr = 0;
        this.vr = 0;
        this.colors = 0;
        this.importantColors = 0;
    }

    public encode() {
        const tempBuffer = Buffer.alloc(this.offset + this.rgbSize);
        this.pos = 0;
        tempBuffer.write(this.flag, this.pos, 2); this.pos += 2;
        tempBuffer.writeUInt32LE(this.fileSize, this.pos); this.pos += 4;
        tempBuffer.writeUInt32LE(this.reserved, this.pos); this.pos += 4;
        tempBuffer.writeUInt32LE(this.offset, this.pos); this.pos += 4;

        tempBuffer.writeUInt32LE(this.headerInfoSize, this.pos); this.pos += 4;
        tempBuffer.writeUInt32LE(this.width, this.pos); this.pos += 4;
        tempBuffer.writeInt32LE(-this.height, this.pos); this.pos += 4;
        tempBuffer.writeUInt16LE(this.planes, this.pos); this.pos += 2;
        tempBuffer.writeUInt16LE(this.bitPP, this.pos); this.pos += 2;
        tempBuffer.writeUInt32LE(this.compress, this.pos); this.pos += 4;
        tempBuffer.writeUInt32LE(this.rgbSize, this.pos); this.pos += 4;
        tempBuffer.writeUInt32LE(this.hr, this.pos); this.pos += 4;
        tempBuffer.writeUInt32LE(this.vr, this.pos); this.pos += 4;
        tempBuffer.writeUInt32LE(this.colors, this.pos); this.pos += 4;
        tempBuffer.writeUInt32LE(this.importantColors, this.pos); this.pos += 4;

        let i = 0;
        const rowBytes = 3 * this.width + this.extraBytes;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const p = this.pos + y * rowBytes + x * 3;
                for (const channel of this.format) {
                    switch (channel) {
                        case 'b': tempBuffer[p] = this.buffer[i++]; break;
                        case 'g': tempBuffer[p + 1] = this.buffer[i++]; break;
                        case 'r': tempBuffer[p + 2] = this.buffer[i++]; break;
                        case 'a': i++; break;
                    }
                }
            }
            if (this.extraBytes > 0) {
                const fillOffset = this.pos + y * rowBytes + this.width * 3;
                tempBuffer.fill(0, fillOffset, fillOffset + this.extraBytes);
            }
        }

        return tempBuffer;
    }
}
