import * as path from 'path';
import * as Jimp from 'jimp';
import { Sdl } from '@kmamal/sdl';
import { Canvas, loadImage, CanvasRenderingContext2D, ImageData } from "canvas";

import { renderToWindow } from '../common/render-utils';
import { TileType } from './tile-type';
import { getAssetsDir } from '../common/file-utils';

interface TextAssets {
    title: string;
    subtitle: string;
    helpPrompt: string;
}

export interface GameAssets {
    graphicsTiles: Canvas[];
    text: TextAssets;
}

export interface RenderRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

class ScreenRenderer {
    private readonly canvas: Canvas;
    private readonly context: CanvasRenderingContext2D;

    public constructor(private readonly window: Sdl.Video.Window) {
        this.canvas = new Canvas(window.width, window.height);
        this.context = this.canvas.getContext("2d");
    }

    public draw(drawAction: (context: CanvasRenderingContext2D) => void) {
        drawAction(this.context);
    }

    public finalize() {
        renderToWindow(this.window, this.canvas);
    }
}

export class GameRenderer {
    private screen: ScreenRenderer | null = null;

    public constructor(private readonly displayScale: number) {}

    private async loadImageToCanvas(source: string | Buffer) {
        const img = await loadImage(source);
        const canvas = new Canvas(img.width * this.displayScale, img.height * this.displayScale);
        canvas.getContext('2d').drawImage(img, 0, 0, img.width * this.displayScale, img.height * this.displayScale);
        return canvas;
    }

    private static jimpToCanvas(image: Jimp, { width, height }: { width: number; height: number }) {
        const canvas = new Canvas(width, height);
        canvas.getContext('2d').putImageData(new ImageData(Uint8ClampedArray.from(image.bitmap.data), width, height), 0, 0);
        return canvas;
    }

    private static async mask(img: Canvas, mask: Canvas) {
        const imgObj = await Jimp.read(img.toBuffer());
        const maskObj = (await Jimp.read(mask.toBuffer())).invert();
        const masked = imgObj.mask(maskObj, 0, 0);
        return GameRenderer.jimpToCanvas(masked, img);
    }

    private static async blackToAlpha(img: Canvas) {
        const imgObj = await Jimp.read(img.toBuffer());
        const black = Jimp.rgbaToInt(0, 0, 0, 0xff);
        const alpha = Jimp.rgbaToInt(0, 0, 0, 0);
        const width = imgObj.getWidth();
        const height = imgObj.getHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (imgObj.getPixelColor(x, y) === black) {
                    imgObj.setPixelColor(alpha, x, y);
                }
            }
        }
        return GameRenderer.jimpToCanvas(imgObj, img);
    }

    private async loadTileToCanvas(tileIndex: number) {
        return this.loadImageToCanvas(path.join(getAssetsDir('tiles/'), `tile${tileIndex}.bmp`));
    }

    public async loadAssets() {
        const tiles: Canvas[] = [];
        for (let i = 0; i < 158; i++) {
            const canvas = await this.loadTileToCanvas(i);
            if ((i >= TileType.DaveRightStart && i <= TileType.DaveRightEnd) || (i === TileType.DaveJumpRight) || (i === TileType.DaveJumpLeft) || (i >= TileType.DaveClimbStart && i <= TileType.DaveClimbEnd) || (i >= TileType.JetpackRightStart && i <= TileType.JetpackLeftEnd)) {
                let maskOffset = 0;
                if (i >= TileType.DaveRightStart && i <= TileType.DaveRightEnd) {
                    maskOffset = 7;
                } else if (i >= TileType.DaveJumpRight && i <= TileType.DaveJumpLeft) {
                    maskOffset = 2;
                } else if (i >= TileType.DaveClimbStart && i <= TileType.DaveClimbEnd) {
                    maskOffset = 3;
                } else if (i >= TileType.JetpackRightStart && i <= TileType.JetpackLeftEnd) {
                    maskOffset = 6;
                }

                tiles.push(await GameRenderer.mask(canvas, await this.loadTileToCanvas(i + maskOffset)));
            } else if ((i >= TileType.MonsterSpiderStart && i <= TileType.MonsterSilverSpinnerEnd) || (i >= TileType.ExplosionStart && i <= TileType.ExplosionEnd)) { // TODO: Mask bullets
                tiles.push(await GameRenderer.blackToAlpha(canvas));
            } else {
                tiles.push(canvas);
            }
        }
        return tiles;
    }

    public startScreen(window: Sdl.Video.Window) {
        this.screen = new ScreenRenderer(window);
        return this;
    }

    private assertScreenIsStarted() {
        if (!this.screen) {
            throw new Error('Call startScreen first');
        }
        return this.screen;
    }

    public drawCanvas(canvas: Canvas, dest: RenderRect, src: Partial<RenderRect> = {}) {
        this.assertScreenIsStarted().draw((context) => {
            context.drawImage(
                canvas,
                src.x ?? 0,
                src.y ?? 0,
                src.width ? src.width * this.displayScale : canvas.width,
                src.height ? src.height * this.displayScale : canvas.height,
                dest.x * this.displayScale,
                dest.y * this.displayScale,
                dest.width * this.displayScale,
                dest.height * this.displayScale
            );
        });
        return this;
    }

    public drawColor(color: string, dest: RenderRect) {
        const canvas = new Canvas(dest.width, dest.height);
        const context = canvas.getContext('2d');
        context.fillStyle = color;
        context.fillRect(0, 0, dest.width, dest.height);
        return this.drawCanvas(canvas, dest);
    }

    public drawText(text: string, size: number, dest: RenderRect) {
        this.assertScreenIsStarted().draw((context) => {
            context.font = `bold ${size * this.displayScale}px sans-serif`;
            context.fillStyle = 'white';
            context.fillText(text, dest.x * this.displayScale, dest.y * this.displayScale, dest.width * this.displayScale);
        });
        return this;
    }

    public render() {
        if (this.screen) {
            this.screen.finalize();
        } else {
            console.warn('Finalize called with nothing to finalize');
        }
        this.screen = null;
    }
}