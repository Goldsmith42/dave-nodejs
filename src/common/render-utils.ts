import { Canvas } from "canvas";
import { Sdl } from "@kmamal/sdl";

export const BMP_FORMAT = 'bgra';
const SDL_FORMAT = BMP_FORMAT + '32' as 'bgra32';

export function renderToWindow(window: Sdl.Video.Window, canvas: Canvas) {
    window.render(window.width, window.height, window.width * 4, SDL_FORMAT, canvas.toBuffer('raw'));
}