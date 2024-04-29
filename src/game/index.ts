import * as path from 'path';
import { promises as fs } from 'fs';
import { video, Sdl } from '@kmamal/sdl';

import { GameAssets, GameRenderer } from './renderer';
import { Entity, TileType } from './tile-type';
import { InputReader } from './input-reader';
import { Direction } from './direction';
import { DaveLevel } from '../common/dave-level';
import { getAssetsDir } from '../common/file-utils';
import { BinaryFileReader } from '../common/binary-file-reader';


enum GameMode {
	Title,
	Gameplay
}

interface MonsterProperties {
	pathIndex: number;
	deadTimer: number;
	monsterX: number;
	monsterY: number;
	monsterPx: number;
	monsterPy: number;
	nextPx: number;
	nextPy: number;
}
interface InactiveMonster extends Partial<MonsterProperties> { type: 0 }
interface ActiveMonster extends MonsterProperties { type: Entity }

type Monster = InactiveMonster | ActiveMonster;

interface GameState {
	quit: boolean;
	tick: number;
	daveTick: number;
	currentLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
	score: number;
	lives: number;
	viewX: number;
	viewY: number;
	scrollX: number;
	daveX: number;
	daveY: number;
	davePx: number;
	davePy: number;
	onGround: boolean;
	lastDir: Direction;

	tryLeft: boolean;
	tryRight: boolean;
	tryJump: boolean;
	tryFire: boolean;
	tryJetpack: boolean;
	tryDown: boolean;
	tryUp: boolean;
	daveFire: boolean;
	daveJetpack: boolean;
	daveClimb: boolean;
	daveDown: boolean;
	daveUp: boolean;
	daveLeft: boolean;
	daveRight: boolean;
	daveJump: boolean;
	jumpTimer: number;
	daveDeadTimer: number;
	jetpackDelay: number;
	checkPickupX: number;
	checkPickupY: number;
	checkDoor: boolean;
	canClimb: boolean;
	trophy: boolean;
	gun: boolean;
	jetpack: number;

	dBulletPx: number;
	dBulletPy: number;
	dBulletDir: Direction;
	eBulletPx: number;
	eBulletPy: number;
	eBulletDir: Direction;

	collisionPoints: boolean[];
	monsters: Monster[];
	levels: DaveLevel[];
	titleLevel: Buffer;

	mode: GameMode;
}

class Game {
	private static readonly TILE_SIZE = 16;
	private static readonly PATH_END = 0xfffffff80 | (0xea & 0x7f);	// The path end is at 0xea but we need to convert it to signed.


	private static onGrid(n: number) {
		return ~~(n / this.TILE_SIZE);
	}

	private readonly game: GameState;

	private windowClosed = false;
	private inputReader: InputReader | null = null;

	public constructor() {
		this.game = {} as GameState;
	}

	public get quit() {
		return this.game.quit;
	}

	public get currentLevel() {
		return this.game.levels[this.game.currentLevel];
	}

	public async init() {
		this.game.quit = false;
		this.game.score = 0;
		this.game.tick = 0;
		this.game.daveTick = 0;
		this.game.currentLevel = 0;
		this.game.lives = 3;
		this.game.viewX = 0;
		this.game.viewY = 0;
		this.game.scrollX = 0;
		this.game.daveX = 2;
		this.game.daveY = 8;
		this.game.davePx = this.game.daveX * Game.TILE_SIZE;
		this.game.davePy = this.game.daveY * Game.TILE_SIZE;
		this.game.jumpTimer = 0;
		this.game.onGround = true;
		this.game.tryRight = false;
		this.game.tryLeft = false;
		this.game.tryJump = false;
		this.game.daveRight = false;
		this.game.daveLeft = false;
		this.game.daveJump = false;
		this.game.checkDoor = false;
		this.game.mode = GameMode.Title;

		this.game.collisionPoints = [];

		this.game.monsters = [];
		for (let j = 0; j < 5; j++) {
			this.game.monsters[j] = { type: 0 };
		}

		this.game.levels = [];
		const assetsDir = getAssetsDir('levels/');
		for (let j = 0; j < 10; j++) {
			this.game.levels[j] = new DaveLevel();

			const filename = `level${j}.dat`;
			using reader = new BinaryFileReader(path.join(assetsDir, filename));
			for (let i = 0; i < DaveLevel.PATH_SIZE; i++) {
				this.game.levels[j].path[i] = await reader.readByte();
			}
			for (let i = 0; i < DaveLevel.TILES_SIZE; i++) {
				this.game.levels[j].tiles[i] = await reader.readByte();
			}
			for (let i = 0; i < DaveLevel.PADDING_SIZE; i++) {
				this.game.levels[j].padding[i] = await reader.readByte();
			}
		}

		this.game.titleLevel = Buffer.alloc(DaveLevel.TITLE_TILES_SIZE);
		using reader = new BinaryFileReader(path.join(assetsDir, 'leveltitle.dat'));
		for (let i = 0; i < this.game.titleLevel.length; i++) {
			this.game.titleLevel[i] = await reader.readByte();
		}
	}

	public startLevel() {
		this.restartLevel();

		for (let j = 0; j < 5; j++) {
			this.game.monsters[j] = {
				type: 0,
				pathIndex: 0,
				deadTimer: 0,
				nextPx: 0,
				nextPy: 0
			};
		}

		switch (this.game.currentLevel) {
			case 2:
				this.game.monsters[0].type = Entity.MonsterSpider;
				this.game.monsters[0].monsterPx = 44 * Game.TILE_SIZE;
				this.game.monsters[0].monsterPy = 4 * Game.TILE_SIZE;

				this.game.monsters[1].type = Entity.MonsterSpider;
				this.game.monsters[1].monsterPx = 59 * Game.TILE_SIZE;
				this.game.monsters[1].monsterPy = 4 * Game.TILE_SIZE;
				break;
			case 3:
				this.game.monsters[0].type = Entity.MonsterPurpleThing;
				this.game.monsters[0].monsterPx = 32 * Game.TILE_SIZE;
				this.game.monsters[0].monsterPy = 2 * Game.TILE_SIZE;
				break;
			case 4:
				this.game.monsters[0].type = Entity.MonsterRedSun;
				this.game.monsters[0].monsterPx = 15 * Game.TILE_SIZE;
				this.game.monsters[0].monsterPy = 3 * Game.TILE_SIZE;

				this.game.monsters[1].type = Entity.MonsterRedSun;
				this.game.monsters[1].monsterPx = 33 * Game.TILE_SIZE;
				this.game.monsters[1].monsterPy = 3 * Game.TILE_SIZE;

				this.game.monsters[2].type = Entity.MonsterRedSun;
				this.game.monsters[2].monsterPx = 49 * Game.TILE_SIZE;
				this.game.monsters[2].monsterPy = 3 * Game.TILE_SIZE;
				break;
			case 5:
				this.game.monsters[0].type = Entity.MonsterGreenBar;
				this.game.monsters[0].monsterPx = 10 * Game.TILE_SIZE;
				this.game.monsters[0].monsterPy = 8 * Game.TILE_SIZE;

				this.game.monsters[1].type = Entity.MonsterGreenBar;
				this.game.monsters[1].monsterPx = 28 * Game.TILE_SIZE;
				this.game.monsters[1].monsterPy = 8 * Game.TILE_SIZE;

				this.game.monsters[2].type = Entity.MonsterGreenBar;
				this.game.monsters[2].monsterPx = 45 * Game.TILE_SIZE;
				this.game.monsters[2].monsterPy = 5 * Game.TILE_SIZE;

				this.game.monsters[3].type = Entity.MonsterGreenBar;
				this.game.monsters[3].monsterPx = 40 * Game.TILE_SIZE;
				this.game.monsters[3].monsterPy = 8 * Game.TILE_SIZE;
				break;
			case 6:
				this.game.monsters[0].type = Entity.MonsterGreySaucer;
				this.game.monsters[0].monsterPx = 5 * Game.TILE_SIZE;
				this.game.monsters[0].monsterPy = 2 * Game.TILE_SIZE;

				this.game.monsters[1].type = Entity.MonsterGreySaucer;
				this.game.monsters[1].monsterPx = 16 * Game.TILE_SIZE;
				this.game.monsters[1].monsterPy = 1 * Game.TILE_SIZE;

				this.game.monsters[2].type = Entity.MonsterGreySaucer;
				this.game.monsters[2].monsterPx = 46 * Game.TILE_SIZE;
				this.game.monsters[2].monsterPy = 2 * Game.TILE_SIZE;

				this.game.monsters[3].type = Entity.MonsterGreySaucer;
				this.game.monsters[3].monsterPx = 56 * Game.TILE_SIZE;
				this.game.monsters[3].monsterPy = 3 * Game.TILE_SIZE;
				break;
			case 7:
				this.game.monsters[0].type = Entity.MonsterDoubleMushroom;
				this.game.monsters[0].monsterPx = 10 * Game.TILE_SIZE;
				this.game.monsters[0].monsterPy = 8 * Game.TILE_SIZE;

				this.game.monsters[1].type = Entity.MonsterDoubleMushroom;
				this.game.monsters[1].monsterPx = 72 * Game.TILE_SIZE;
				this.game.monsters[1].monsterPy = 2 * Game.TILE_SIZE;

				this.game.monsters[2].type = Entity.MonsterDoubleMushroom;
				this.game.monsters[2].monsterPx = 84 * Game.TILE_SIZE;
				this.game.monsters[2].monsterPy = 1 * Game.TILE_SIZE;
				break;
			case 8:
				this.game.monsters[0].type = Entity.MonsterGreenCircle;
				this.game.monsters[0].monsterPx = 35 * Game.TILE_SIZE;
				this.game.monsters[0].monsterPy = 8 * Game.TILE_SIZE;

				this.game.monsters[1].type = Entity.MonsterGreenCircle;
				this.game.monsters[1].monsterPx = 41 * Game.TILE_SIZE;
				this.game.monsters[1].monsterPy = 8 * Game.TILE_SIZE;

				this.game.monsters[2].type = Entity.MonsterGreenCircle;
				this.game.monsters[2].monsterPx = 49 * Game.TILE_SIZE;
				this.game.monsters[2].monsterPy = 2 * Game.TILE_SIZE;

				this.game.monsters[3].type = Entity.MonsterGreenCircle;
				this.game.monsters[3].monsterPx = 65 * Game.TILE_SIZE;
				this.game.monsters[3].monsterPy = 8 * Game.TILE_SIZE;
				break;
			case 9:
				this.game.monsters[0].type = Entity.MonsterSilverSpinner;
				this.game.monsters[0].monsterPx = 45 * Game.TILE_SIZE;
				this.game.monsters[0].monsterPy = 8 * Game.TILE_SIZE;

				this.game.monsters[1].type = Entity.MonsterSilverSpinner;
				this.game.monsters[1].monsterPx = 51 * Game.TILE_SIZE;
				this.game.monsters[1].monsterPy = 2 * Game.TILE_SIZE;

				this.game.monsters[2].type = Entity.MonsterSilverSpinner;
				this.game.monsters[2].monsterPx = 65 * Game.TILE_SIZE;
				this.game.monsters[2].monsterPy = 3 * Game.TILE_SIZE;

				this.game.monsters[3].type = Entity.MonsterSilverSpinner;
				this.game.monsters[3].monsterPx = 82 * Game.TILE_SIZE;
				this.game.monsters[3].monsterPy = 2 * Game.TILE_SIZE;
				break;
		}

		this.game.davePx = this.game.daveX * Game.TILE_SIZE;
		this.game.davePy = this.game.daveY * Game.TILE_SIZE;
		this.game.daveFire = false;
		this.game.daveJetpack = false;
		this.game.daveDeadTimer = 0;
		this.game.trophy = false;
		this.game.gun = false;
		this.game.jetpack = 0;
		this.game.checkDoor = false;
		this.game.viewX = 0;
		this.game.viewY = 0;
		this.game.jumpTimer = 0;
		this.game.dBulletPx = 0;
		this.game.dBulletPy = 0;
		this.game.eBulletPx = 0;
		this.game.eBulletPy = 0;
	}

	public initInput(window: Sdl.Video.Window) {
		this.inputReader = new InputReader(window);
		window.on('close', () => {
			console.log('close event');
			this.game.quit = true;
			this.windowClosed = true;
		});
	}

	public async runLoop(window: Sdl.Video.Window, renderer: GameRenderer, assets: GameAssets) {
		await new Promise<void>((resolve, reject) => {
			let ongoing = true;

			const loop = () => {
				try {
					const timerBegin = Date.now();
					let timerEnd: number;
					try {
						this.checkInput();
						this.update();
						this.render(window, renderer, assets);
					} catch (e) {
						if (!this.quit && ongoing) {
							throw e;
						}
					} finally {
						timerEnd = Date.now();
					}

					if (this.quit) {
						ongoing = false;
						resolve();
					}
					if (ongoing) {
						let delay = 33 - (timerEnd - timerBegin);
						if (delay > 33) {
							delay = 0;
						}
						setTimeout(() => loop(), delay);
					}
				} catch (e) {
					ongoing = false;
					reject(e);
				}
			}

			loop();
		});
		return this.windowClosed;
	}

	private checkInput() {
		if (!this.inputReader) {
			throw new Error("Input reader is not initialized");
		}

		if (this.game.mode === GameMode.Gameplay) {
			if (this.inputReader.isKeyDown('right')) { this.game.tryRight = true; }
			if (this.inputReader.isKeyDown('left')) { this.game.tryLeft = true; }
			if (this.inputReader.isKeyDown('up')) { this.game.tryJump = true; }
			if (this.inputReader.isKeyDown('down')) { this.game.tryDown = true; }
			if (this.inputReader.isKeyDown('ctrl')) { this.game.tryFire = true; }
			if (this.inputReader.isKeyDown('alt')) { this.game.tryJetpack = true; }
		} else if (this.game.mode === GameMode.Title) {
			if (['return', 'space', 'ctrl', 'alt'].some(key => this.inputReader!.isKeyDown(key))) {
				this.game.mode = GameMode.Gameplay;
				this.startLevel();
			}
		}
	}

	public update() {
		if (this.game.mode === GameMode.Gameplay) {
			this.checkCollision();
			this.pickupItem(this.game.checkPickupX, this.game.checkPickupY);
			this.updateDBullet();
			this.updateEBullet();
			this.verifyInput();
			this.moveDave();
			this.moveMonsters();
			this.fireMonsters();
			this.scrollScreen();
			this.applyGravity();
		}
		this.updateLevel();
		this.clearInput();
	}

	public render(window: Sdl.Video.Window, renderer: GameRenderer, assets: GameAssets) {
		renderer.startScreen(window);

		this.drawWorld(renderer, assets);
		if (this.game.mode === GameMode.Gameplay) {
			this.drawDave(renderer, assets);
			this.drawMonsters(renderer, assets);
			this.drawDaveBullet(renderer, assets);
			this.drawMonsterBullet(renderer, assets);
		}
		this.drawUI(renderer, assets);

		renderer.render();
	}

	private checkCollision() {
		this.game.collisionPoints = [
			this.isClear(this.game.davePx + 4, this.game.davePy - 1),
			this.isClear(this.game.davePx + 10, this.game.davePy - 1),
			this.isClear(this.game.davePx + 11, this.game.davePy + 4),
			this.isClear(this.game.davePx + 11, this.game.davePy + 12),
			this.isClear(this.game.davePx + 10, this.game.davePy + 16),
			this.isClear(this.game.davePx + 4, this.game.davePy + 16),
			this.isClear(this.game.davePx + 3, this.game.davePy + 12),
			this.isClear(this.game.davePx + 3, this.game.davePy + 4)
		];

		this.game.onGround = (!this.game.collisionPoints[4] && !this.game.collisionPoints[5]) || this.game.daveClimb;

		const gridX = Game.onGrid(this.game.davePx + 6);
		const gridY = Game.onGrid(this.game.davePy + 8);
		const entity = gridX < 100 && gridY < 10 ? this.getTileObject(gridX, gridY) : Entity.Empty;
		if (entity.isClimbable) {
			this.game.canClimb = true;
		} else {
			this.game.canClimb = false;
			this.game.daveClimb = false;
		}
	}

	/** Check if keyboard input is valid. */
	private verifyInput() {
		// Dave is dead. No input is valid.
		if (this.game.daveDeadTimer) {
			return;
		}

		if (this.game.tryRight && this.game.collisionPoints[2] && this.game.collisionPoints[3]) {
			this.game.daveRight = true;
		}

		if (this.game.tryLeft && this.game.collisionPoints[6] && this.game.collisionPoints[7]) {
			this.game.daveLeft = true;
		}

		if (this.game.tryJump && this.game.onGround && !this.game.daveJump && !this.game.daveJetpack && !this.game.canClimb && this.game.collisionPoints[2] && this.game.collisionPoints[3]) {
			this.game.daveJump = true;
		}

		if (this.game.tryJump && this.game.canClimb) {
			this.game.daveUp = true;
			this.game.daveClimb = true;
		}

		if (this.game.tryFire && this.game.gun && !this.game.dBulletPx && !this.game.dBulletPy) {
			this.game.daveFire = true;
		}

		if (this.game.tryJetpack && this.game.jetpack && !this.game.jetpackDelay) {
			this.game.daveJetpack = !this.game.daveJetpack;
			this.game.jetpackDelay = 10;
		}

		if (this.game.tryDown && (this.game.daveJetpack || this.game.daveClimb) && this.game.collisionPoints[4] && this.game.collisionPoints[5]) {
			this.game.daveDown = true;
		}

		if (this.game.tryJump && this.game.daveJetpack && this.game.collisionPoints[0] && this.game.collisionPoints[1]) {
			this.game.daveUp = true;
		}
	}

	private tickDave() {
		this.game.daveTick++;
		if (this.game.daveTick >= Number.MAX_VALUE) {
			this.game.daveTick = 0;
		}
	}

	private moveDave() {
		const MULTIPLIER = 1;

		this.game.daveX = Game.onGrid(this.game.davePx);
		this.game.daveY = Game.onGrid(this.game.davePy);

		if (this.game.daveY > 9) {
			this.game.daveY = 0;
			this.game.davePy = -16;
		}

		if (this.game.daveRight) {
			this.game.davePx += 2 * MULTIPLIER;
			this.game.lastDir = Direction.Right;
			this.tickDave();
			this.game.daveRight = false;
		}
		if (this.game.daveLeft) {
			this.game.davePx -= 2 * MULTIPLIER;
			this.game.lastDir = Direction.Left;
			this.tickDave();
			this.game.daveLeft = false;
		}
		if (this.game.daveDown) {
			this.game.davePy += 2 * MULTIPLIER;
			this.game.daveDown = false;
		}
		if (this.game.daveUp) {
			this.game.davePy -= 2 * MULTIPLIER;
			this.game.daveUp = false;
		}

		if (this.game.daveJump) {
			if (!this.game.jumpTimer) {
				this.game.jumpTimer = ~~(30 * MULTIPLIER);
				this.game.lastDir = Direction.Neutral;
			}

			if (this.game.collisionPoints[0] && this.game.collisionPoints[1]) {
				if (this.game.jumpTimer > 16) {
					this.game.davePy -= 2 * MULTIPLIER;
				}
				if (this.game.jumpTimer >= 12 && this.game.jumpTimer <= 15) {
					this.game.davePy -= 1 * MULTIPLIER;
				}
			}

			this.game.jumpTimer--;

			if (!this.game.jumpTimer) {
				this.game.daveJump = false;
			}
		}

		if (this.game.daveFire) {
			this.game.dBulletDir = this.game.lastDir || Direction.Right;

			if (this.game.dBulletDir === Direction.Right) {
				this.game.dBulletPx = this.game.davePx + 18;
			} else if (this.game.dBulletDir === Direction.Left) {
				this.game.dBulletPx = this.game.davePx - 8;
			}

			this.game.dBulletPy = this.game.davePy + 8;
			this.game.daveFire = false;
		}
	}

	private moveMonsters() {
		for (const monster of this.game.monsters) {
			if (monster.type && !monster.deadTimer) {
				if (!monster.nextPx && !monster.nextPy) {
					monster.nextPx = this.currentLevel.path[monster.pathIndex];
					monster.nextPy = this.currentLevel.path[monster.pathIndex + 1];
					monster.pathIndex += 2;
				}

				if (monster.nextPx === Game.PATH_END && monster.nextPy === Game.PATH_END) {
					monster.nextPx = this.currentLevel.path[0];
					monster.nextPy = this.currentLevel.path[1];
					monster.pathIndex = 2;
				}

				if (monster.nextPx < 0) {
					monster.monsterPx -= 1;
					monster.nextPx++;
				}
				if (monster.nextPx > 0) {
					monster.monsterPx += 1;
					monster.nextPx--;
				}
				if (monster.nextPy < 0) {
					monster.monsterPy -= 1;
					monster.nextPy++;
				}
				if (monster.nextPy > 0) {
					monster.monsterPy += 1;
					monster.nextPy--;
				}

				monster.monsterX = ~~(monster.monsterPx / Game.TILE_SIZE);
				monster.monsterY = ~~(monster.monsterPy / Game.TILE_SIZE);
			}
		}
	}

	private fireMonsters() {
		if (!this.game.eBulletPx && !this.game.eBulletPy) {
			for (const monster of this.game.monsters) {
				if (monster.type && this.isVisible(monster.monsterPx) && !monster.deadTimer) {
					this.game.eBulletDir = this.game.davePx < monster.monsterPx ? Direction.Left : Direction.Right;
					if (!this.game.eBulletDir) {
						this.game.eBulletDir = Direction.Right;
					}
					if (this.game.eBulletDir === Direction.Right) {
						this.game.eBulletPx = monster.monsterPx + 18;
					} else if (this.game.eBulletDir === Direction.Left) {
						this.game.eBulletPx = monster.monsterPx - 8;
					}
					this.game.eBulletPy = monster.monsterPy + 8;
				}
			}
		}
	}

	private applyGravity() {
		if (!this.game.daveJump && !this.game.onGround && !this.game.daveJetpack && !this.game.daveClimb) {
			if (this.isClear(this.game.davePx + 4, this.game.davePy + 17)) {
				this.game.davePy += 2;
			} else {
				const notAlign = this.game.davePy % Game.TILE_SIZE;
				if (notAlign) {
					this.game.davePy = notAlign < 8 ?
						this.game.davePy - notAlign :
						this.game.davePy + Game.TILE_SIZE - notAlign;
				}
			}
		}
	}

	private updateLevel() {
		this.game.tick++;
		if (this.game.tick >= Number.MAX_VALUE) {
			this.game.tick = 0;
		}

		if (this.game.jetpackDelay) {
			this.game.jetpackDelay--;
		}
		if (this.game.daveJetpack) {
			this.game.jetpack--;
			if (!this.game.jetpack) {
				this.game.daveJetpack = false;
			}
		}

		if (this.game.checkDoor) {
			if (this.game.trophy) {
				this.addScore(2000);
				if (this.game.currentLevel < 9) {
					this.game.currentLevel++;
					this.startLevel();
				} else {
					console.log(`You won with ${this.game.score} points`);
					this.game.quit = true;
				}
			} else {
				this.game.checkDoor = false;
			}
		}

		if (this.game.daveDeadTimer) {
			this.game.daveDeadTimer--;
			if (!this.game.daveDeadTimer) {
				if (this.game.lives) {
					this.game.lives--;
					this.restartLevel();
				} else {
					this.game.quit = true;
				}
			}
		}

		for (const monster of this.game.monsters) {
			if (monster.deadTimer) {
				monster.deadTimer--;
				if (!monster.deadTimer) {
					monster.type = 0;
				}
			} else {
				if (monster.type) {
					if (monster.monsterX === this.game.daveX && monster.monsterY === this.game.daveY) {
						monster.deadTimer = 30;
						this.game.daveDeadTimer = 30;
					}
				}
			}
		}
	}

	private restartLevel() {
		switch (this.game.currentLevel) {
			case 0: this.game.daveX = 2; this.game.daveY = 8; break;
			case 1: this.game.daveX = 1; this.game.daveY = 8; break;
			case 2: this.game.daveX = 2; this.game.daveY = 5; break;
			case 3: this.game.daveX = 1; this.game.daveY = 5; break;
			case 4: this.game.daveX = 2; this.game.daveY = 8; break;
			case 5: this.game.daveX = 2; this.game.daveY = 8; break;
			case 6: this.game.daveX = 1; this.game.daveY = 2; break;
			case 7: this.game.daveX = 2; this.game.daveY = 8; break;
			case 8: this.game.daveX = 6; this.game.daveY = 1; break;
			case 9: this.game.daveX = 2; this.game.daveY = 8; break;
		}

		this.game.davePx = this.game.daveX * Game.TILE_SIZE;
		this.game.davePy = this.game.daveY * Game.TILE_SIZE;
	}

	private clearInput() {
		this.game.tryJump = false;
		this.game.tryLeft = false;
		this.game.tryRight = false;
		this.game.tryFire = false;
		this.game.tryJetpack = false;
		this.game.tryDown = false;
		this.game.tryUp = false;
	}

	private scrollScreen() {
		if (this.game.daveX - this.game.viewX >= 18) {
			this.game.scrollX = 15;
		}
		if (this.game.daveX - this.game.viewX < 2) {
			this.game.scrollX = -15;
		}

		if (this.game.currentLevel < 0) {
			this.game.currentLevel = 0;
		} else if (this.game.currentLevel > 9) {
			this.game.currentLevel = 9;
		}

		if (this.game.scrollX > 0) {
			if (this.game.viewX === 80) {
				this.game.scrollX = 0;
			} else {
				this.game.viewX++;
				this.game.scrollX--;
			}
		}

		if (this.game.scrollX < 0) {
			if (this.game.viewX === 0) {
				this.game.scrollX = 0;
			} else {
				this.game.viewX--;
				this.game.scrollX++;
			}
		}
	}

	private getTile(gridX: number, gridY: number): TileType {
		return this.currentLevel.tiles[gridY * 100 + gridX];
	}

	private getTileObject(gridX: number, gridY: number): Entity {
		return Entity.getByType(this.getTile(gridX, gridY));
	}

	private setTile(gridX: number, gridY: number, value: number) {
		this.currentLevel.tiles[gridY * 100 + gridX] = value;
	}

	private pickupItem(gridX: number, gridY: number) {
		if (!gridX || !gridY) {
			return;
		}

		const entity = this.getTileObject(gridX, gridY);
		if (entity.hasScoreValue) {
			this.addScore(entity.scoreValue);
		}
		if (entity.is(Entity.Jetpack)) {
			this.game.jetpack = 0xff;
		} else if (entity.is(Entity.Trophy)) {
			this.game.trophy = true;
		} else if (entity.is(Entity.Gun)) {
			this.game.gun = true;
		}

		this.setTile(gridX, gridY, 0);

		this.game.checkPickupX = 0;
		this.game.checkPickupY = 0;
	}

	private updateDBullet() {
		if (!this.game.dBulletPx && !this.game.dBulletPy) {
			return;
		}

		if (!this.isClear(this.game.dBulletPx, this.game.dBulletPy, false)) {
			this.game.dBulletPx = this.game.dBulletPy = 0;
		}

		const gridX = Game.onGrid(this.game.dBulletPx);
		const gridY = Game.onGrid(this.game.dBulletPy);

		if (gridX - this.game.viewX < 1 || gridX - this.game.viewX > 20) {
			this.game.dBulletPx = this.game.dBulletPy = 0;
		}

		if (this.game.dBulletPx) {
			this.game.dBulletPx += this.game.dBulletDir * 4;

			for (const monster of this.game.monsters) {
				if (monster.type) {
					const { monsterX: mx, monsterY: my } = monster;

					if ((gridY === my || gridY === my + 1) && (gridX === mx || gridX === mx + 1)) {
						this.game.dBulletPx = this.game.dBulletPy = 0;
						monster.deadTimer = 30;
						this.addScore(monster.type.scoreValue);
					}
				}
			}
		}
	}

	private updateEBullet() {
		if (!this.game.eBulletPx && !this.game.eBulletPy) {
			return;
		}

		if (!this.isClear(this.game.eBulletPx, this.game.eBulletPy, false)) {
			this.game.eBulletPx = this.game.eBulletPy = 0;
		}

		if (!this.isVisible(this.game.eBulletPx)) {
			this.game.eBulletPx = this.game.eBulletPy = 0;
		} else if (this.game.eBulletPx) {
			this.game.eBulletPx += this.game.eBulletDir * 4;

			const gridX = Game.onGrid(this.game.eBulletPx);
			const gridY = Game.onGrid(this.game.eBulletPy);

			if (gridY === this.game.daveY && gridX === this.game.daveX) {
				this.game.eBulletPx = this.game.eBulletPy = 0;
				this.game.daveDeadTimer = 30;
			}
		}
	}

	private updateFrame(entity: Entity, salt: number): TileType {
		return entity.getFrame(this.game.tick, salt);
	}

	/**
	 * Draws the tiles of the game map to a renderer.
	 * @param renderer The renderer to draw with.
	 * @param assets The assets to draw the tiles from.
	 * @param numberOfTiles An object specifying the number of tiles to draw along each axis.
	 * @param numberOfTiles.x The number of tiles to draw along the horizontal axis.
	 * @param numberOfTiles.y The number of tiles to draw along the vertical axis.
	 * @param getTileEntity A function that gets the correct graphics tile based on the ordinal number of the horizontal and vertical tile.
	 * @param [tileOffset={ x: 0, y: 0 }] The number of tiles to offset by starting from the upper left corner of the screen.
	 * @param tileOffset.x The number of tiles to offset by along the horizontal axis.
	 * @param tileOffset.x The number of tiles to offset by along the horizontal axis.
	 */
	private drawMap(
		renderer: GameRenderer,
		assets: GameAssets,
		getTileEntity: (x: number, y: number) => Entity,
		numberOfTiles: { x: number; y: number },
		tileOffset = { x: 0, y: 0 }
	) {
		const width = Game.TILE_SIZE;
		for (let j = 0; j < numberOfTiles.y; j++) {
			const y = Game.TILE_SIZE + (j + tileOffset.y) * Game.TILE_SIZE;
			for (let i = 0; i < numberOfTiles.x; i++) {
				const x = (i + tileOffset.x) * Game.TILE_SIZE;
				const tileIndex = this.updateFrame(getTileEntity(i, j), i);
				if (tileIndex >= assets.graphicsTiles.length) {
					throw new Error(`Tile index error: ${tileIndex} for ${i}, ${j} at ${this.game.tick}`);
				}
				let height = Game.TILE_SIZE;
				if (j < numberOfTiles.y - 1) {
					renderer.drawCanvas(assets.graphicsTiles[tileIndex], { x, y, width, height });
				} else {
					height = ~~(height / 2.5);
					// For the last y, only draw the upper third
					renderer.drawCanvas(assets.graphicsTiles[tileIndex], { x, y, width, height }, { height });
				}
			}
		}
	}

	private drawWorld(renderer: GameRenderer, assets: GameAssets) {
		if (this.game.mode === GameMode.Gameplay) {
			this.drawMap(
				renderer,
				assets,
				(x, y) => this.getTileObject(this.game.viewX + x, y),
				{ x: 20, y: 10 }
			);
		} else if (this.game.mode === GameMode.Title) {
			this.drawMap(
				renderer,
				assets,
				(x, y) => Entity.getByType(this.game.titleLevel[y * 10 + x]),
				{ x: 10, y: 7 },
				{ x: 5, y: 3 }
			);
		}
	}

	private drawDave(renderer: GameRenderer, assets: GameAssets) {
		const tileIndex = this.game.daveDeadTimer ?
			Entity.Explosion.getFrame(this.game.tick) :
			Entity.getDaveFrame(this.game.daveTick, {
				direction: this.game.lastDir,
				jetpack: this.game.daveJetpack,
				jump: this.game.daveJump,
				onGround: this.game.onGround,
				climbing: this.game.daveClimb
			});
		renderer.drawCanvas(assets.graphicsTiles[tileIndex], {
			x: this.game.davePx - this.game.viewX * Game.TILE_SIZE,
			y: Game.TILE_SIZE + this.game.davePy,
			width: 20,
			height: 16
		});
	}

	private drawMonsters(renderer: GameRenderer, assets: GameAssets) {
		for (const monster of this.game.monsters) {
			if (monster.type) {
				const tileIndex = (monster.deadTimer ?
					Entity.Explosion :
					monster.type
				).getFrame(this.game.tick);
				renderer.drawCanvas(assets.graphicsTiles[tileIndex], {
					x: monster.monsterPx - (this.game.viewX * Game.TILE_SIZE),
					y: Game.TILE_SIZE + monster.monsterPy,
					width: 20,
					height: 16
				});
			}
		}
	}

	private drawDaveBullet(renderer: GameRenderer, assets: GameAssets) {
		if (this.game.dBulletPx && this.game.dBulletPy) {
			const tileIndex = this.game.dBulletDir > Direction.Neutral ? TileType.DaveBulletRight : TileType.DaveBulletLeft;
			renderer.drawCanvas(assets.graphicsTiles[tileIndex], {
				x: this.game.dBulletPx - this.game.viewX * Game.TILE_SIZE,
				y: Game.TILE_SIZE + this.game.dBulletPy,
				width: 12,
				height: 3
			});
		}
	}

	private drawMonsterBullet(renderer: GameRenderer, assets: GameAssets) {
		if (this.game.eBulletPx && this.game.eBulletPy) {
			const tileIndex = this.game.eBulletDir > Direction.Neutral ? TileType.MonsterBulletRight : TileType.MonsterBulletLeft;
			renderer.drawCanvas(assets.graphicsTiles[tileIndex], {
				x: this.game.eBulletPx - this.game.viewX * Game.TILE_SIZE,
				y: Game.TILE_SIZE + this.game.eBulletPy,
				width: 12,
				height: 3
			});
		}
	}

	private drawUI(renderer: GameRenderer, assets: GameAssets) {
		if (this.game.mode === GameMode.Gameplay) {
			const dest = {
				x: 0,
				y: 16,
				width: 960,
				height: 1
			};
			const white = `rgb(${0xee}, ${0xee}, ${0xee})`;
			renderer.drawColor(white, dest);
			dest.y = 176;
			renderer.drawColor(white, dest);

			dest.x = 1;
			dest.y = 2;
			dest.width = 62;
			dest.height = 11;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UIScoreBanner], dest);

			dest.x = 120;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UILevelBanner], dest);

			dest.x = 200;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UILivesBanner], dest);

			dest.x = 64;
			dest.width = 8;
			dest.height = 11;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UI0 + ~~(this.game.score / 10000) % 10], dest);
			dest.x += 8;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UI0 + ~~(this.game.score / 1000) % 10], dest);
			dest.x += 8;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UI0 + ~~(this.game.score / 100) % 10], dest);
			dest.x += 8;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UI0 + ~~(this.game.score / 10) % 10], dest);
			dest.x += 8;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UI0], dest);

			dest.x = 170;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UI0 + ~~((this.game.currentLevel + 1) / 10)], dest);
			dest.x += 8;
			renderer.drawCanvas(assets.graphicsTiles[TileType.UI0 + (this.game.currentLevel + 1) % 10], dest);

			for (let i = 0; i < this.game.lives; i++) {
				dest.width = 16;
				dest.height = 12;
				dest.x = (255 + dest.width * i);
				renderer.drawCanvas(assets.graphicsTiles[TileType.UIIconLife], dest);
			}

			if (this.game.trophy) {
				dest.x = 72;
				dest.y = 180;
				dest.width = 176;
				dest.height = 14;
				renderer.drawCanvas(assets.graphicsTiles[TileType.UIMessageTrophy], dest);
			}

			if (this.game.gun) {
				dest.x = 255;
				dest.y = 180;
				dest.width = 62;
				dest.height = 11;
				renderer.drawCanvas(assets.graphicsTiles[TileType.UIIconGun], dest);
			}

			if (this.game.jetpack) {
				dest.x = 1;
				dest.y = 177;
				dest.width = 62;
				dest.height = 11;
				renderer.drawCanvas(assets.graphicsTiles[TileType.UIIconJetpack], dest);

				dest.y = 190;
				dest.height = 8;
				renderer.drawCanvas(assets.graphicsTiles[TileType.UIBarJetpack], dest);

				dest.x = 2;
				dest.y = 192;
				dest.width = this.game.jetpack * 0.23;
				dest.height = 4;
				renderer.drawColor(`rgb(${0xee}, 0, 0)`, dest);
			}
		} else if (this.game.mode === GameMode.Title) {
			const dest = {
				x: 104,	// half of (width of the screen - width of the title)
				y: 0,
				width: 112,
				height: 47
			};
			renderer.drawCanvas(assets.graphicsTiles[this.updateFrame(Entity.Title, 0)], dest);

			const fontSize = (Game.TILE_SIZE - 2) / 2;

			dest.y = 51;
			dest.x = 123;
			dest.width = 320;
			renderer.drawText(assets.text.title, fontSize, dest);

			dest.y = 59;
			dest.x = 108;
			renderer.drawText(assets.text.subtitle, fontSize, dest);

			dest.y = 185;
			dest.x = 100;
			renderer.drawText(assets.text.helpPrompt, fontSize, dest);
		}
	}

	private isClear(px: number, py: number, isDave = true) {
		const gridX = ~~(px / Game.TILE_SIZE);
		const gridY = ~~(py / Game.TILE_SIZE);
		const entity = this.getTileObject(gridX, gridY);

		if (gridX > 99 || gridY > 9) {
			return true;
		}
		if (entity.hasCollision) {
			return false;
		}

		if (isDave) {
			if (entity.is(Entity.Door)) {
				this.game.checkDoor = true;
			} else if (entity.isPickup) {
				this.game.checkPickupX = gridX;
				this.game.checkPickupY = gridY;
			} else if (entity.isHazard && !this.game.daveDeadTimer) {
				this.game.daveDeadTimer = 30;
			}
		}

		return true;
	}

	private isVisible(px: number) {
		const posX = px / Game.TILE_SIZE;
		return (posX - this.game.viewX < 20 && posX - this.game.viewX >= 0);
	}

	private addScore(newScore: number) {
		const LIVES_SCORE_BOUNDARY = 20000;
		if (~(this.game.score / LIVES_SCORE_BOUNDARY) !== ~((this.game.score + newScore) / LIVES_SCORE_BOUNDARY)) {
			this.game.lives++;
		}
		this.game.score += newScore;
	}
}

async function loadText() {
	const assetsDir = getAssetsDir('text/');
	return {
		title: await fs.readFile(path.join(assetsDir, 'title.txt'), 'ascii'),
		subtitle: await fs.readFile(path.join(assetsDir, 'subtitle.txt'), 'ascii'),
		helpPrompt: await fs.readFile(path.join(assetsDir, 'helpprompt.txt'), 'ascii')
	};
}

async function main() {
	const DISPLAY_SCALE = 3;

	const game: Game = new Game();
	await game.init();

	const window = video.createWindow({ width: 320 * DISPLAY_SCALE, height: 200 * DISPLAY_SCALE });
	const renderer = new GameRenderer(DISPLAY_SCALE);
	const graphicsTiles = await renderer.loadAssets();
	const text = await loadText();

	game.initInput(window);
	const windowClosed = await game.runLoop(window, renderer, { graphicsTiles, text });
	if (!windowClosed) {
		window.destroy();
	}
}

main();
