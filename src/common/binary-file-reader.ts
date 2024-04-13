import { promises as fs } from 'fs';

/** Helper class that reads a binary file and keeps track of the position in the file. */
export class BinaryFileReader implements Disposable {
    private fd: fs.FileHandle | null = null;

    public constructor(private readonly filePath: string, private pos = 0) {}

    public seek(pos: number) {
        this.pos = pos;
        return this;
    }

    public async open() {
        this.fd = await fs.open(this.filePath);
        return this;
    }

    private async read(readFn: (buffer: Buffer) => number, size: number) {
        const buffer = Buffer.alloc(size);
        if (!this.fd) {
            await this.open();
        }
        await this.fd!.read({
            buffer,
            length: size,
            position: this.pos
        });
        this.pos += size;
        return readFn(buffer);
    }

    public readDword() {
        return this.read(b => b.readUint32LE(), 4);
    }

    public readByte() {
        return this.read(b => b.readUInt8(), 1);
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