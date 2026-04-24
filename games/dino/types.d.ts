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
    cloudSpawn?: string | null;
    cloudDespawn?: string | null;
}

export interface GameThemeSkySunSounds {
    dayStarted?: string | null;
    dayEnded?: string | null;
    sunsetStarted?: string | null;
    sunsetEnded?: string | null;
    nightStarted?: string | null;
    nightEnded?: string | null;
}

export interface GameThemeSkySounds {
    cloud?: GameThemeSkyCloudSounds;
    sun?: GameThemeSkySunSounds;
}

export interface GameThemeSounds {
    game?: {
        scoreHundred?: string | null;
        scoreThousand?: string | null;
        backgroundMusic?: string | null;
    };
    cactus?: {
        cactusSpawn?: string | null;
        cactusDespawn?: string | null;
    };
    dino?: {
        dinoJump?: string | null;
        dinoLand?: string | null;
        dinoCrouch?: string | null;
        dinoDeath?: string | null;
        dinoWalk?: string | null;
    };
    ground?: {
        groundShake?: string | null;
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