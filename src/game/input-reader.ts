import { Sdl } from '@kmamal/sdl';

/** Helper class that keeps track of the state of buttons on the keyboard. */
export class InputReader {
  private readonly keyState: Record<string, boolean>;

  public constructor(window: Sdl.Video.Window) {
    this.keyState = {};
    window.on('keyDown', event => {
      if (event.key) {
        this.keyState[event.key] = true;
      }
		});
    window.on('keyUp', event => {
      if (event.key) {
        this.keyState[event.key] = false;
      }
    })
  }

  public isKeyDown(key: string) {
    return !!this.keyState[key];
  }
}