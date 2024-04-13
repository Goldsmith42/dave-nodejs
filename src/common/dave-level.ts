export class DaveLevel {
    public static readonly PATH_SIZE = 256;
    public static readonly TILES_SIZE = 1000;
    public static readonly PADDING_SIZE = 24;

    public readonly path: Int8Array;
    public readonly tiles: Buffer;
    public readonly padding: Buffer;

    public constructor() {
        this.path = new Int8Array(Buffer.alloc(DaveLevel.PATH_SIZE));
        this.tiles = Buffer.alloc(DaveLevel.TILES_SIZE);
        this.padding = Buffer.alloc(DaveLevel.PADDING_SIZE);
    }
}