export interface GameThemeTextures {
    cactus: string;
    dino: string;
    cloud: string;
}

export interface GameThemeSun {
    day?: string;
    sunset?: string;
    night?: string;
}

export interface GameThemeVariantColors {
    bg1: string;
    bg2: string;
    gr1: string;
    gr2: string;
    gr3: string;
}

export interface GameThemeVariants {
    day: GameThemeVariantColors;
    sunset: GameThemeVariantColors;
    night: GameThemeVariantColors;
}

export interface GameThemeSkyCloudSounds {
    cloudSpawn?: string;
    cloudDespawn?: string;
}

export interface GameThemeSkySunSounds {
    dayStarted?: string;
    dayEnded?: string;
    sunsetStarted?: string;
    sunsetEnded?: string;
    nightStarted?: string;
    nightEnded?: string;
}

export interface GameThemeSkySounds {
    cloud?: GameThemeSkyCloudSounds;
    sun?: GameThemeSkySunSounds;
}

export interface GameThemeSounds {
    game?: {
        scoreHundred?: string;
        scoreThousand?: string;
        backgroundMusic?: string;
    };
    cactus?: {
        cactusSpawn?: string;
        cactusDespawn?: string;
    };
    dino?: {
        dinoJump?: string;
        dinoLand?: string;
        dinoCrouch?: string;
        dinoDeath?: string;
        dinoWalk?: string;
    };
    ground?: {
        groundShake?: string;
    };
    sky?: GameThemeSkySounds;
}

export interface GameTheme {
    name: string;
    textures: GameThemeTextures;
    sun?: GameThemeSun;
    sounds?: GameThemeSounds;
    variants: GameThemeVariants;
}

export interface Playlist {
    name: string;
    audios: string[];
    index: number;
    loop: boolean;
    shuffle: boolean;
    playing: boolean;
    track?: HTMLAudioElement | string;
    current?: HTMLAudioElement;
}

export interface PlaylistOptions {
    loop?: boolean;
    shuffle?: boolean;
    track?: HTMLAudioElement | string;
}