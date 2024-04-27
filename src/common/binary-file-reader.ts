import { promises as fs } from 'fs';

export enum Sizes {
    Int32 = 4,
    Int16 = 2,
    Byte = 1
}

/** Helper class that reads a binary file and keeps track of the position in the file. */
export class BinaryFileReader implements Disposable {
    private fd: fs.FileHandle | null = null;

    public constructor(private readonly filePath: string, private pos = 0) { }

    public seek(pos: number) {
        this.pos = pos;
        return this;
    }

    public async open() {
        this.fd = await fs.open(this.filePath);
        return this;
    }

    private async read<T extends number | string>(readFn: (buffer: Buffer) => T, size: number) {
        return readFn(await this.readIntoBuffer(Buffer.alloc(size), size));
    }

    public async readIntoBuffer(buffer: Buffer, size: number = buffer.length) {
        if (!this.fd) {
            await this.open();
        }
        await this.fd!.read({
            buffer,
            length: size,
            position: this.pos
        });
        this.pos += size;
        return buffer;
    }

    public readDword() {
        return this.read(b => b.readUint32LE(), Sizes.Int32);
    }

    public readUint16() {
        return this.read(b => b.readUint16LE(), Sizes.Int16);
    }

    public readByte() {
        return this.read(b => b.readUInt8(), Sizes.Byte);
    }

    public skip(bytes: number) {
        this.pos += bytes;
        return this;
    }

    public async readString(size: number) {
        let result = await this.read(b => b.subarray(0, size).toString('ascii'), size);
        // If the string is null-terminated or null-padded, cut out the zeroes.
        for (let i = 0; i < result.length; i++) {
            if (result.charCodeAt(i) === 0) {
                result = result.substring(0, i);
                break;
            }
        }
        return result;
    }

    public async readRest() {
        const fileSize = (await this.fd!.stat()).size;
        const buffer = Buffer.alloc(fileSize - this.pos);
        await this.fd!.read({ buffer, position: this.pos });
        this.pos += fileSize;
        return buffer;
    }

    public async close() {
        if (this.fd) {
            await this.fd.close();
            this.fd = null;
        }
    }

    [Symbol.dispose]() {
        return this.close();
    }
}