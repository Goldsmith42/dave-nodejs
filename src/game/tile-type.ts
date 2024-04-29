import { Direction } from "./direction";

export enum TileType {
	Empty,
	Rock,
	Door,
	SilverBar,
	Jetpack,
	BlueBrick,
	FireStart,
	FireEnd = 9,
	TrophyStart,
	TrophyEnd = 14,
	PipeHorizontal = 15,
	PipeVertical,
	RedBrick,
	NormalRock,
	BlueWall,
	Gun,
	RockSlope1,
	RockSlope2,
	RockSlope3,
	RockSlope4,
	WeedStart,
	PurpleBarVertical = 29,
	PurpleBarHorizontal,
  TreeStart = 33,
  TreeEnd = 35,
	WaterStart,
	WaterEnd = 40,
  Stars,
	BlueDiamond = 47,
	PurpleBall,
	RedDiamond,
	Crown,
	Ring,
	Wand,
	DaveRightStart,
  DaveDefault = 56,
	DaveLeftStart,
  DaveRightEnd = 59,
	DaveJumpRight = 67,
	DaveJumpLeft,
  DaveClimbStart = 71,
	DaveClimbEnd = 73,
	JetpackRightStart = 77,
	JetpackLeftStart = 80,
	JetpackLeftEnd = 82,
	MonsterSpiderStart = 89,
	MonsterPurpleThingStart = 93,
	MonsterRedSunStart = 97,
	MonsterGreenBarStart = 101,
	MonsterGreySaucerStart = 105,
	MonsterDoubleMushroomStart = 109,
	MonsterGreenCircleStart = 113,
	MonsterSilverSpinnerStart = 117,
	MonsterSilverSpinnerEnd = 120,
	MonsterBulletRight,
	MonsterBulletLeft = 124,
	DaveBulletRight = 127,
	DaveBulletLeft,
	ExplosionStart = 129,
  ExplosionEnd = 132,
  UIIconJetpack = 133,
  UIIconGun,
  UILivesBanner,
  UILevelBanner,
  UIScoreBanner,
  UIMessageTrophy,
  UIBarJetpack = 141,
  UIIconLife = 143,
	TitleStart = 144,
  UI0 = 148
}

enum AnimationSpeed {
	Fast = 5,
	Slow = 3
}

interface EntityProperties {
		animated: boolean;
		animationSpeed: AnimationSpeed;
		climbable?: boolean;
		hasCollision?: boolean;
		isPickup?: boolean;
		isHazard?: boolean;
		scoreValue?: number;
}

/**
 * Represents an entity that can be displayed using one or more tiles.
 * Also contains readonly versions of all the entities that can appear in the game.
 */
export class Entity {
	/**
	 * Creates an ordered list of integers starting with the first parameter and ending with the last parameter.
	 * The first parameter must be equal to or less than the second parameter.
	 */
	private static createRange(start: number, end: number) {
		const range = [start];
		for (let i = start + 1; i <= end; i++) {
			range.push(i);
		}
		return range;
	}

	/**
	 * Creates an ordered list of integers starting with the first parameter with the number of elements specified by the second parameter.
	 */
	private static createAnimationRange(start: TileType, numberOfFrames: number) {
		return Entity.createRange(start, start + numberOfFrames - 1);
	}

	public static readonly Empty = new Entity(TileType.Empty);
	public static readonly Rock = this.createWall(TileType.Rock);
	public static readonly Door = new Entity(TileType.Door);
	public static readonly SilverBar = this.createWall(TileType.SilverBar);
	public static readonly Jetpack = new Entity(TileType.Jetpack, { isPickup: true });
	public static readonly BlueBrick = this.createWall(TileType.BlueBrick);
	public static readonly Fire = new Entity(TileType.FireStart, { isHazard: true }, 4);
	public static readonly Trophy = new Entity(
		TileType.TrophyStart,
		{ scoreValue: 1000 },
		5
	);
	public static readonly PipeHorizontal = this.createWall(TileType.PipeHorizontal);
	public static readonly PipeVertical = this.createWall(TileType.PipeVertical);
	public static readonly RedBrick = this.createWall(TileType.RedBrick);
	public static readonly NormalRock = this.createWall(TileType.NormalRock);
	public static readonly BlueWall = this.createWall(TileType.BlueWall);
	public static readonly Gun = new Entity(TileType.Gun, { isPickup: true });
	public static readonly RockSlope1 = this.createWall(TileType.RockSlope1);
	public static readonly RockSlope2 = this.createWall(TileType.RockSlope2);
	public static readonly RockSlope3 = this.createWall(TileType.RockSlope3);
	public static readonly RockSlope4 = this.createWall(TileType.RockSlope4);
	public static readonly Weed = new Entity(TileType.WeedStart, { isHazard: true }, 4);
	public static readonly PurpleBarVertical = this.createWall(TileType.PurpleBarVertical);
	public static readonly PurpleBarHorizontal = this.createWall(TileType.PurpleBarHorizontal);
	public static readonly Tree = new Entity(
		TileType.TreeStart,
		{ climbable: true, animated: false },
		3
	);
	public static readonly Water = new Entity(TileType.WaterStart, { isHazard: true }, 5);
	public static readonly Stars = new Entity(TileType.Stars, { climbable: true });
	public static readonly BlueDiamond = new Entity(TileType.BlueDiamond, { scoreValue: 100 });
	public static readonly PurpleBall = new Entity(TileType.PurpleBall, { scoreValue: 50 });
	public static readonly RedDiamond = new Entity(TileType.RedDiamond, { scoreValue: 150 });
	public static readonly Crown = new Entity(TileType.Crown, { scoreValue: 300 });
	public static readonly Ring = new Entity(TileType.Ring, { scoreValue: 200 });
	public static readonly Wand = new Entity(TileType.Wand, { scoreValue: 500 });
	public static readonly DaveRight = new Entity(TileType.DaveRightStart, {}, 3);
	public static readonly DaveLeft = new Entity(TileType.DaveLeftStart, {}, 3);
	public static readonly DaveClimb = new Entity(TileType.DaveClimbStart, {}, 3);
	public static readonly DaveJetpackRight = new Entity(TileType.JetpackRightStart, {}, 3);
	public static readonly DaveJetpackLeft = new Entity(TileType.JetpackLeftStart, {}, 3);
	public static readonly MonsterSpider = Entity.createMonster(TileType.MonsterSpiderStart);
	public static readonly MonsterPurpleThing = Entity.createMonster(TileType.MonsterPurpleThingStart);
	public static readonly MonsterRedSun = Entity.createMonster(TileType.MonsterRedSunStart);
	public static readonly MonsterGreenBar = Entity.createMonster(TileType.MonsterGreenBarStart);
	public static readonly MonsterGreySaucer = Entity.createMonster(TileType.MonsterGreySaucerStart);
	public static readonly MonsterDoubleMushroom = Entity.createMonster(TileType.MonsterDoubleMushroomStart);
	public static readonly MonsterGreenCircle = Entity.createMonster(TileType.MonsterGreenCircleStart);
	public static readonly MonsterSilverSpinner = Entity.createMonster(TileType.MonsterSilverSpinnerStart);
	public static readonly Explosion = new Entity(TileType.ExplosionStart, { animationSpeed: 3 }, 4)
	public static readonly Title = new Entity(TileType.TitleStart, {}, 4);

	private readonly indexRange: TileType[];
	private readonly properties: EntityProperties;

	/**
	 * Creates a new entity object.
	 * @param type The starting tile of the entity.
	 * @param [properties={}] Various entity properties that help control entity behavior.
	 * @param [properties.animated] Set to true if the entity contains more tiles but they are not intended to be used as animation.
	 * @param [properties.animationSpeed=AnimationSpeed.Fast] If this is an animated entity, set to AnimationSpeed.Slow to animate slower.
	 * @param [properties.climbable=false] Set to true to indicate that Dave is supposed to be able to climb this entity.
	 * @param [properties.hasCollision=false] Set to true to indicate that Dave and bullets cannot pass through this entity.
	 * @param [properties.isPickup] Set to true to indicate that Dave can pick this entity up. By default this is off, but setting scoreValue will automatically set it to true unless otherwise specified.
	 * @param [properties.isHazard=false] Set to true to indicate that Dave will be killed on collision with this entity.
	 * @param [properties.scoreValue] A value indicating the number of points Dave gets from picking this item up. Specifying this automatically sets isPickup to true unless otherwise specified.
	 * @param [numberOfFrames=1] If the entity has more than one frame of tile data, specify the number of consecutive TileTypes that this takes up here.
	 */
	private constructor(
		type: TileType,
		properties: Partial<EntityProperties> = {},
		numberOfFrames = 1
	) {
		this.indexRange = Entity.createAnimationRange(type, numberOfFrames);
		this.properties = {
			...{ animated: numberOfFrames > 1, animationSpeed: AnimationSpeed.Fast, isPickup: properties.scoreValue != null },
			...properties
		};
	}

	private static createMonster(type: TileType) {
		// All monsters are slow-animated and use 4 frames
		return new Entity(type, { animationSpeed: AnimationSpeed.Slow, isPickup: false, scoreValue: 300 }, 4);
	}

	private static createWall(type: TileType) {
		return new Entity(type, { hasCollision: true });
	}

	/** Gets an entity based on its tile type. */
	public static getByType(type: TileType) {
		for (const key of Object.getOwnPropertyNames(Entity)) {
			const prop = (Entity as any)[key];
			if (prop instanceof Entity && prop.indexRange.includes(type)) {
				return prop;
			}
		}
		return new Entity(type);
	}

	/** The starting tile of the entity. */
	private get type() {
		return this.indexRange[0];
	}

	/** Indicates whether Dave should be able to climb this entity. */
	public get isClimbable() {
		return !!this.properties.climbable;
	}

	/** Indicates whether the entity should increase your score on pickup. */
	public get hasScoreValue() {
		return this.properties.scoreValue != null;
	}

	/** The amount of points that this entity is worth when picked up. */
	public get scoreValue() {
		return this.properties.scoreValue ?? 0;
	}

	/** Indicates whether Dave and bullets should not be able to pass through this entity. */
	public get hasCollision() {
		return this.properties.hasCollision;
	}

	/** Indicates whether Dave should be able to pick this entity up. */
	public get isPickup() {
		return this.properties.isPickup;
	}

	/** Indicates whether Dave should be killed when colliding this entity. */
	public get isHazard() {
		return this.properties.isHazard;
	}

	/** Detemines whether this entity is of a specific type. */
	public is(entity: Entity) {
		return this.type === entity.type;
	}

	/**
	 * Gets the tile index that should be used to draw the entity.
	 * Used to get the correct animation frame.
	 * @param tick The tick value that is used to display a different animation frame at different times.
	 * @param [salt=0] A value that modifies the animation counter so that tiles of the same entity can appear out of sync with each other.
	 * @returns 
	 */
	public getFrame(tick: number, salt = 0) {
		return this.properties.animated ?
			(this.type + ~~(salt + tick / this.properties.animationSpeed) % this.indexRange.length) as TileType :
			this.type;
	}

	/**
	 * Gets the tile index that should be used to draw Dave
	 * (unless he's exploding, in that case use the Explosion entity with getFrame).
	 * @param tick The tick value that is used to display a different animation frame at different times.
	 * @param daveProperties The state that Dave is in.
	 * @param daveProperties.direction The direction that Dave is facing.
	 * @param daveProperties.jetpack Whether Dave is using the jetpack.
	 * @param daveProperties.jump Whether Dave is jumping.
	 * @param daveProperties.onGround Whether Dave is on the ground.
	 * @param daveProperties.climbing Whether Dave is currently climbing.
	 * @returns 
	 */
	public static getDaveFrame(tick: number, daveProperties: {
		direction: Direction;
		jetpack: boolean;
		jump: boolean;
		onGround: boolean;
		climbing: boolean;
	}) {
		if (daveProperties.jetpack) {
			return daveProperties.direction >= Direction.Neutral ?
				Entity.DaveJetpackRight.getFrame(tick) :
				Entity.DaveJetpackLeft.getFrame(tick);
		}
		if (daveProperties.climbing) {
			return Entity.DaveClimb.getFrame(tick);
		}
		if (daveProperties.jump || !daveProperties.onGround) {
			return daveProperties.direction >= Direction.Neutral ?
				TileType.DaveJumpRight :
				TileType.DaveJumpLeft
		}
		switch (daveProperties.direction) {
			case Direction.Left: return Entity.DaveLeft.getFrame(tick);
			case Direction.Right: return Entity.DaveRight.getFrame(tick);
		}
		return TileType.DaveDefault;
	}
}