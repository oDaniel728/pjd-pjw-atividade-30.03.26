// [[ BD ]]

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, update, get, onValue, push, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBZGph8g79sGTWu5CVynTpeXaUOar-wn8",
    authDomain: "jogos-web-ifam-login-ac5da.firebaseapp.com",
    databaseURL: "https://jogos-web-ifam-login-ac5da-default-rtdb.firebaseio.com",
    projectId: "jogos-web-ifam-login-ac5da",
    storageBucket: "jogos-web-ifam-login-ac5da.firebasestorage.app",
    messagingSenderId: "267249166179",
    appId: "1:267249166179:web:7b06913ce99b86b4489556",
    measurementId: "G-F0LSKZE1W2"
};
// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let usuarioAtual = null;
let dadosUsuario = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    
    usuarioAtual = user;

    await carregarDadosUsuario(user.uid);
});
async function saveUserData() {
    if (!usuarioAtual) return;

    const uid = usuarioAtual.uid;

    const total = Session.total_score;
    const max = Session.max_score;
    const nivel = Math.floor(total / 500) + 1;

    const data = {
        nome: dadosUsuario.nome,
        total_score: total,
        max_score: max,
        nivel: nivel,
        rounds: Session.rounds,
    }

    // 1. dados principais do usuário
    await set(ref(db, `usuarios/${uid}`), data);

    // 2. ranking separado (evita bagunça no users)
    await set(ref(db, `ranking/${uid}`), data);

    // 3. histórico (sempre append)
    await push(ref(db, `historico/${uid}`), {
        ...data,
        data: new Date().toISOString()
    });
}
async function carregarDadosUsuario(uid) {
    const snapshot = await get(ref(db, `usuarios/${uid}`));

    if (!snapshot.exists()) return;

    const data = snapshot.val();

    dadosUsuario = data;

    Session.total_score = data.total_score || 0;
    Session.max_score = data.max_score || 0;
    Session.rounds = data.rounds || 0;
}

// [[ EXPANDER ]]
const Expander = {
    /**
     * Expande uma expressão
     * @param {string} input
     * @returns {string[]}
     */
    expand(input) {
        const tokens = this.tokenize(input);
        const expanded = tokens.map(t => this.expandToken(t));
        return this.cartesian(expanded);
    },

    /**
     * Tokeniza respeitando escapes
     * @param {string} input
     * @returns {string[]}
     */
    tokenize(input) {
        /** @type {string[]} */
        const tokens = [];

        let buffer = "";
        let escape = false;
        let inBracket = false;

        for (let i = 0; i < input.length; i++) {
            const c = input[i];

            if (escape) {
                buffer += c;
                escape = false;
                continue;
            }

            if (c === "\\") {
                escape = true;
                continue;
            }

            if (c === "[") {
                if (buffer) tokens.push(buffer);
                buffer = "[";
                inBracket = true;
                continue;
            }

            if (c === "]" && inBracket) {
                buffer += "]";
                tokens.push(buffer);
                buffer = "";
                inBracket = false;
                continue;
            }

            buffer += c;
        }

        if (buffer) tokens.push(buffer);

        return tokens;
    },

    /**
     * Expande um token
     * @param {string} token
     * @returns {string[]}
     */
    expandToken(token) {
        // lista: [a,b,c]
        if (token.startsWith("[") && token.endsWith("]")) {
            const inner = token.slice(1, -1);
            return this.splitList(inner);
        }

        // range: x..y
        if (token.includes("..")) {
            return this.expandRange(token);
        }

        return [token];
    },

    /**
     * Split de lista respeitando escape
     * @param {string} input
     * @returns {string[]}
     */
    splitList(input) {
        /** @type {string[]} */
        const result = [];

        let buffer = "";
        let escape = false;

        for (let i = 0; i < input.length; i++) {
            const c = input[i];

            if (escape) {
                buffer += c;
                escape = false;
                continue;
            }

            if (c === "\\") {
                escape = true;
                continue;
            }

            if (c === ",") {
                result.push(buffer);
                buffer = "";
                continue;
            }

            buffer += c;
        }

        if (buffer) result.push(buffer);

        return result;
    },

    /**
     * Expande range (ex: 1..3 ou a..c)
     * @param {string} token
     * @returns {string[]}
     */
    expandRange(token) {
        const match = token.match(/^(.*?)(\d+|\w)\.\.(\d+|\w)(.*)$/);
        if (!match) return [token];

        const [, prefix, start, end, suffix] = match;

        /** @type {string[]} */
        const result = [];

        // número
        if (!isNaN(Number(start)) && !isNaN(Number(end))) {
            const a = Number(start);
            const b = Number(end);

            for (let i = a; i <= b; i++) {
                result.push(prefix + i + suffix);
            }
            return result;
        }

        // char
        const a = start.charCodeAt(0);
        const b = end.charCodeAt(0);

        for (let i = a; i <= b; i++) {
            result.push(prefix + String.fromCharCode(i) + suffix);
        }

        return result;
    },

    /**
     * Produto cartesiano
     * @param {string[][]} arrays
     * @returns {string[]}
     */
    cartesian(arrays) {
        return arrays.reduce(
            (acc, curr) =>
                acc.flatMap(a => curr.map(b => a + b)),
            [""]
        );
    }
};
// [[ ASSETS ]]

const AudioService = {
    /** @type {Map<string, any>} */
    config: new Map(),

    /** @type {Map<string, HTMLAudioElement[]>} */
    cache: new Map(),

    /** @type {Map<string, Set<HTMLAudioElement>>} */
    activeByTrack: new Map(),

    /**
     * Pega um canal de áudio
     * @param {string} name
     * @returns {HTMLAudioElement|null}
     */
    getAudioTrack(name) {
        const el = document.querySelector(`audio[track][name="${name}"]`);
        if (!el) {
            console.warn(`Audio track ${name} not found.`);
            return null;
        }
        return el;
    },

    /**
     * Carrega config JSON
     * @returns {Promise<Record<string, string|string[]>>}
     */
    async getAudioConfig() {
        const res = await fetch("./assets/soundconfig.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },

    /**
     * Inicializa config + preload
     * @returns {Promise<void>}
     */
    async updateConfig() {
        this.config = new Map(
            Object.entries(await this.getAudioConfig())
        );

        await this.preloadAll();
    },

    /**
     * Resolve paths
     * @param {string} name
     * @returns {string[]}
     */
    resolvePaths(name) {
        if (!this.config.has(name)) return [];

        const value = this.config.get(name);

        /** @type {string[]} */
        let pool = [];

        if (typeof value === "string") {
            pool = Expander.expand(value);
        } else {
            for (const entry of value) {
                pool.push(...Expander.expand(entry));
            }
        }

        return pool.map(p => `./assets/sounds/${p}`);
    },

    /**
     * Preload geral
     * @returns {Promise<void>}
     */
    async preloadAll() {
        const tasks = [];

        for (const key of this.config.keys()) {
            tasks.push(this.preload(key));
        }

        await Promise.all(tasks);
    },

    /**
     * Preload por nome
     * @param {string} name
     * @returns {Promise<void>}
     */
    async preload(name) {
        const paths = this.resolvePaths(name);

        /** @type {HTMLAudioElement[]} */
        const audios = [];

        for (const path of paths) {
            const audio = new Audio();
            audio.src = path;
            audio.preload = "auto";

            const p = new Promise(resolve => {
                audio.addEventListener("canplaythrough", resolve, { once: true });
                audio.addEventListener("error", resolve, { once: true });
            });

            audio.load();
            await p;

            audios.push(audio);
        }

        this.cache.set(name, audios);
    },

    /**
     * Registra áudio ativo
     * @param {string} trackName
     * @param {HTMLAudioElement} audio
     */
    _register(trackName, audio) {
        if (!this.activeByTrack.has(trackName)) {
            this.activeByTrack.set(trackName, new Set());
        }

        const set = this.activeByTrack.get(trackName);
        set.add(audio);

        audio.addEventListener("ended", () => {
            set.delete(audio);
        });
    },

    /**
     * Toca áudio
     * @param {string} name
     * @param {string|HTMLAudioElement} track
     */
    playAudio(name, track) {
        const pool = this.cache.get(name);
        if (!pool || pool.length === 0) return;

        let trackName = "";
        if (typeof track === "string") {
            trackName = track;
            track = this.getAudioTrack(track);
        } else if (track instanceof HTMLAudioElement) {
            trackName = track.getAttribute("name") || "";
        }

        if (!track) return;

        const base = pool[Math.floor(Math.random() * pool.length)];

        const audio = /** @type {HTMLAudioElement} */ (track.cloneNode());

        audio.src = base.src;
        audio.volume = track.volume;
        audio.currentTime = 0;

        if (trackName) {
            this._register(trackName, audio);
        }

        audio.play();
    },

    /**
     * Define volume de uma track (inclusive ativos)
     * @param {string} trackName
     * @param {number} volume
     */
    setTrackVolume(trackName, volume) {
        volume = Math.max(0, Math.min(1, volume));

        const track = this.getAudioTrack(trackName);
        if (track) track.volume = volume;

        const set = this.activeByTrack.get(trackName);
        if (!set) return;

        for (const audio of set) {
            audio.volume = volume;
        }
    }
};

const PlaylistService = {
    /** @type {Map<string, Playlist>} */
    playlists: new Map(),

    /**
     * Cria playlist
     * @param {string} name
     * @param {string[]} audios
     * @param {PlaylistOptions} [options]
     */
    create(name, audios, options = {}) {
        this.playlists.set(name, {
            name,
            audios,
            index: 0,
            loop: options.loop ?? false,
            shuffle: options.shuffle ?? false,
            playing: false,
            track: options.track ?? null,
            current: null
        });
        return name;
    },

    /**
     * Toca playlist
     * @param {string} name
     */
    play(name) {
        const pl = this.playlists.get(name);
        if (!pl) return;

        if (typeof pl.track === "string") {
            pl.track = AudioService.getAudioTrack(pl.track);
        }

        if (!pl.track) return;

        pl.playing = true;
        this._playCurrent(pl);
    },

    /**
     * Para playlist
     * @param {string} name
     */
    stop(name) {
        const pl = this.playlists.get(name);
        if (!pl) return;

        pl.playing = false;

        if (pl.current) {
            pl.current.pause();
            pl.current.currentTime = 0;
        }
    },

    /**
     * Próxima música
     * @param {string} name
     */
    next(name) {
        const pl = this.playlists.get(name);
        if (!pl) return;

        this._advance(pl);
        this._playCurrent(pl);
    },

    /**
     * Avança índice
     * @param {Playlist} pl
     */
    _advance(pl) {
        if (pl.shuffle) {
            pl.index = Math.floor(Math.random() * pl.audios.length);
            return;
        }

        pl.index++;

        if (pl.index >= pl.audios.length) {
            if (pl.loop) {
                pl.index = 0;
            } else {
                pl.playing = false;
            }
        }
    },

    /**
     * Toca atual
     * @param {Playlist} pl
     */
    _playCurrent(pl) {
        if (!pl.playing) return;

        const name = pl.audios[pl.index];
        const pool = AudioService.cache.get(name);
        if (!pool || pool.length === 0) return;

        const base = pool[Math.floor(Math.random() * pool.length)];
        const audio = /** @type {HTMLAudioElement} */ (pl.track.cloneNode());
        const trackName = pl.track.getAttribute("name") || "";

        audio.src = base.src;
        audio.volume = pl.track.volume;
        audio.currentTime = 0;

        if (trackName) {
            AudioService._register(trackName, audio);
        }

        pl.current = audio;

        audio.addEventListener("ended", () => {
            this._advance(pl);
            this._playCurrent(pl);
        });

        audio.play();
    }
};

/**
 * @typedef {Object} Playlist
 * @property {string} name
 * @property {string[]} audios
 * @property {number} index
 * @property {boolean} loop
 * @property {boolean} shuffle
 * @property {boolean} playing
 * @property {HTMLAudioElement|string|null} track
 * @property {HTMLAudioElement|null} current
 */

/**
 * @typedef {Object} PlaylistOptions
 * @property {boolean} [loop]
 * @property {boolean} [shuffle]
 * @property {HTMLAudioElement|string} [track]
 */
AudioService.updateConfig();
// [[ STORAGE ]]
const Config = {
    key: "config",
    loaded: false,
    data: {},

    load() {
        if (this.loaded) return this.data;
        this.loaded = true;

        const raw = localStorage.getItem(this.key);

        // Primeiro uso: cria um objeto vazio persistido.
        if (!raw) {
            this.data = {};
            this.save();
            return this.data;
        }

        try {
            const parsed = JSON.parse(raw);
            this.data = (parsed && typeof parsed === "object") ? parsed : {};
        } catch {
            this.data = {};
            this.save();
        }

        return this.data;
    },

    save() {
        localStorage.setItem(this.key, JSON.stringify(this.data));
    },

    get(name, fallback = null) {
        return Object.hasOwn(this.data, name)
            ? this.data[name]
            : fallback;
    },

    set(name, value) {
        this.data[name] = value;
        this.save();
    },

    setDefault(name, value) {
        if (!Object.hasOwn(this.data, name)) {
            this.data[name] = value;
            this.save();
        }
    }
};

Config.load();

Config.setDefault("bgmActivated", true);
Config.setDefault("sfxActivated", true);
Config.setDefault("scoreSounds", true);

const Session = {
    temporary: ["temporary", "score", "auto_saving", "loaded"],
    
    score: 0,
    total_score: 0,
    max_score: 0,
    rounds: 0,

    auto_save: false,
    auto_saving: false,
    loaded: false,

    aSave: saveUserData,
    save() {
        localStorage.setItem(
            "session", JSON.stringify(this)
        );
        console.log(JSON.stringify(this));
        this.aSave();
    },
    load() {
        if (this.loaded) return;
        this.loaded = true;
        // const data = localStorage.getItem(
        //     "session"
        // ) ?? "{}";
        // const obj = JSON.parse(data);
        // console.log(obj)
        // Object.assign(this, obj);
    },
    _startAutoSave() {
        if (this.auto_saving) return;
        this.auto_saving = true;
        setInterval(() => {
            this._autoSaveHandler();
        }, 1000)
    },
    _autoSaveHandler() {
        if (!this.auto_save) return;
        this.save();
    }
}

// [[ ELEMENTOS ]]
const dino = document.querySelector('.dino');
const nuvem = document.querySelector(".nuvem");
const board = document.getElementById('game-board');
const scoreElement = document.querySelectorAll('.score-show');
const maxScoreElement = document.getElementById('max-score');
const startMsg = document.getElementById('start-msg');
const gameOverMsg = document.querySelector('.gameOverMsg');
const gameOverMsgScoreShower = document.querySelector(".score-show-gameover");
const configElements = document.querySelectorAll("[data-config]");

let solElement = null;

/** 
 * @param   { string } name
 * @param   { any } value
 * @returns { void }
 * */
function changeCSSVariable(name, value) {
    document.documentElement.style.setProperty(`--${name}`, value.toString());
}
/**
 * Obtém o valor de uma variável CSS
 * @param   {string} name
 * @param   {HTMLElement} [el]
 * @returns {string}
 */
function getCSSVariable(name, el = document.documentElement) {
    return getComputedStyle(el)
        .getPropertyValue(`--${name}`)
        .trim();
}
const sfxTrack = AudioService.getAudioTrack("sfx");
const bgmTrack = AudioService.getAudioTrack("bgm");
const scoTrack = AudioService.getAudioTrack("sco");
const defaultSfxVolume = 0.5;
const defaultBgmVolume = 0.2;

/**
 * @param {string} key
 * @returns {boolean}
 */
function getBooleanConfig(key) {
    const value = Config.get(key, false);

    if (typeof value === "boolean") return value;

    const normalized = Boolean(value);
    Config.set(key, normalized);
    return normalized;
}

/**
 * @param {HTMLElement} container
 * @param {boolean} isActive
 * @returns {void}
 */
function renderConfigElement(container, isActive) {
    const activatedEl = container.querySelector(".activated");
    const deactivatedEl = container.querySelector(".deactivated");

    if (activatedEl) activatedEl.classList.toggle("hidden", !isActive);
    if (deactivatedEl) deactivatedEl.classList.toggle("hidden", isActive);

    container.setAttribute("aria-pressed", String(isActive));
}

/**
 * @param {string} key
 * @param {boolean} value
 * @returns {void}
 */
function applyConfigEffect(key, value) {
    if (key === "bgmActivated") {
        AudioService.setTrackVolume("bgm", value ? defaultBgmVolume : 0);
        return;
    }

    if (key === "sfxActivated") {
        AudioService.setTrackVolume("sfx", value ? defaultSfxVolume : 0);
        return;
    }

    if (key === "scoreSounds") {
        AudioService.setTrackVolume("sco", value ? 0.6 : 0);
    }
}

/**
 * Liga a UI com o objeto Config para chaves booleanas em [data-config].
 * @returns {void}
 */
function bindConfigElements() {
    configElements.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        const key = el.dataset.config;
        if (!key) return;

        const value = getBooleanConfig(key);
        renderConfigElement(el, value);
        applyConfigEffect(key, value);

        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");

        const toggle = () => {
            const next = !getBooleanConfig(key);
            Config.set(key, next);
            renderConfigElement(el, next);
            applyConfigEffect(key, next);
        };

        el.addEventListener("click", toggle);
        el.addEventListener("keydown", (event) => {
            if (event.code !== "Enter" && event.code !== "Space") return;
            event.preventDefault();
            toggle();
        });
    });
}

bindConfigElements();

// [[ VARIÁVEIS ]]
let isGameOver = false;
let scoreInterval;
let checkCollisionInterval;
let jumping = false;
let gameStarted = false;
let musicPlaying = false;

let cactusTimeout;
let cactusAnimationDuration = 3;
let cactusAnimationDurationRandomness = 0;
let cactusIntervalDuration = 2000;
let cactusIntervalDurationRandomness = 500;

let cloudTimeout;
let cloudAnimationDuration = 10;
let cloudAnimationDurationRandomness = 10;
let cloudIntervalDuration = 1500;
let cloudIntervalDurationRandomness = 500;
let cloudScale = 1;
let cloudScaleRandomness = 1;
let dinoRotation = 0;
const daynightCycleDuration = 30;
const scoreIntervalDuration = 0.10;

let cactusTexture = "🌵";
let dinoTexture = "🦖";
let cloudTexture = "☁️";

const defaultBackgroundColor1 = getCSSVariable("background-color1");
const defaultBackgroundColor2 = getCSSVariable("background-color2");

const defaultGroundColor1 = getCSSVariable("ground-color1");
const defaultGroundColor2 = getCSSVariable("ground-color2");
const defaultGroundColor3 = getCSSVariable("ground-color3");

function applyDayNightCycleDuration() {
    changeCSSVariable("daynight-cycle-duration", `${daynightCycleDuration}s`);
}

/**
 * Quantidade de pontos para trocar de turno (day -> sunset -> night)
 * baseada em: pontos por segundo * segundos por turno.
 * @returns {number}
 */
function getPointsPerTurn() {
    if (scoreIntervalDuration <= 0) return 1;
    return Math.max(1, Math.round(daynightCycleDuration / scoreIntervalDuration));
}

applyDayNightCycleDuration();

console.log(dadosUsuario)

// [[ CACTO INICIAL ]]
const randomTime = Math.random() * cactusIntervalDurationRandomness + cactusIntervalDuration;
cactusTimeout = setTimeout(spawnCactus, randomTime);

const randomCloudTime = Math.random() * cloudIntervalDurationRandomness + cloudIntervalDuration;
cloudTimeout = setTimeout(spawnCloud, randomCloudTime);

// [[ EVENTOS ]]
document.addEventListener("keydown", (event) => {
    if (
        event.code === 'Space' ||
        event.code === "ArrowUp" || // Questão 3
        event.code === "KeyW"
    ) {
        handleAction(true);
    }
});

board.addEventListener('click', () => {
    handleAction(false);
});


function startBackgroundMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
    AudioService.setTrackVolume(
        "sfx",
        getBooleanConfig("sfxActivated") ? defaultSfxVolume : 0
    );
    AudioService.setTrackVolume(
        "bgm",
        getBooleanConfig("bgmActivated") ? defaultBgmVolume : 0
    );

    const bgmPlaylist = PlaylistService.create(
        "bgm",
        ["bg-song"],
        {
            loop: true,
            track: bgmTrack
        }
    );
    PlaylistService.play(bgmPlaylist);
}

document.addEventListener("load", () => {
    Session.load();
    console.log("Carregando dados");
});
document.addEventListener("beforeunload", () => {
    console.log("Guardando Dados")
    Session.save();
});

function once() {
    if (musicPlaying) return;
    startBackgroundMusic();
}

// [[ THEME SYSTEM ]]
const ThemeSystem = {
    currentThemeIndex: -1,
    currentVariant: "day", // "day", "sunset", "night"

    themes: [
        {
            name: "sky",
            textures: { cactus: "🦖", dino: "🌵", cloud: "☀️" },
            sun: { day: "☀️", sunset: "⛅", night: "🌙" },
            variants: {
                day: { bg1: "#C4A95A", bg2: "#8B7355", gr1: "#87CEEB", gr2: "#528db7", gr3: "#2b527c" },
                sunset: { bg1: "#FF8C42", bg2: "#E63946", gr1: "#F1A208", gr2: "#D62828", gr3: "#A4161A" },
                night: { bg1: "#1a1a2e", bg2: "#16213e", gr1: "#4a5568", gr2: "#2d3748", gr3: "#1a202c" }
            }
        },
        {
            name: "neon",
            textures: { cactus: "🔺", dino: "🟨", cloud: "⬜◽" },
            sun: { day: "", sunset: "", night: "" },
            variants: {
                day: { bg1: "#6797fe", bg2: "#3a5fb0", gr1: "#8250eb", gr2: "#4e2673", gr3: "#2b1340" },
                sunset: { bg1: "#FF6B6B", bg2: "#FFA500", gr1: "#FF4D6D", gr2: "#C1121F", gr3: "#780000" },
                night: { bg1: "#0a0e27", bg2: "#16213e", gr1: "#5a189a", gr2: "#3c096c", gr3: "#240046" }
            }
        },
        {
            name: "dark",
            textures: { cactus: "🔥", dino: "💧", cloud: "☁️" },
            sun: { day: "", sunset: "", night: "" },
            variants: {
                day: { bg1: "#00002d", bg2: "#020215", gr1: "#aaaaaa", gr2: "#333333", gr3: "#111111" },
                sunset: { bg1: "#1a051e", bg2: "#36052c", gr1: "#E8B4B8", gr2: "#A0616D", gr3: "#5D3E3E" },
                night: { bg1: "#000000", bg2: "#0a0a0a", gr1: "#555555", gr2: "#222222", gr3: "#050505" }
            }
        },
        {
            name: "forest",
            textures: { cactus: "🌳", dino: "🦕", cloud: "🌧️" },
            sun: { day: "☀️", sunset: "⛅", night: "🌙" },
            variants: {
                day: { bg1: "#201f2d", bg2: "#39365a", gr1: "#03491b", gr2: "#003000", gr3: "#001800" },
                sunset: { bg1: "#3D2817", bg2: "#5C3D2E", gr1: "#8B4513", gr2: "#654321", gr3: "#4A2511" },
                night: { bg1: "#0d1b0f", bg2: "#1a2e1b", gr1: "#001a00", gr2: "#000d00", gr3: "#000400" }
            }
        },
        {
            name: "default",
            textures: { cactus: "🌵", dino: "🦖", cloud: "☁️" },
            sun: { day: "☀️", sunset: "⛅", night: "🌙" },
            variants: {
                day: { bg1: "#87CEEB", bg2: "#42afda", gr1: "#C4A95A", gr2: "#8B7355", gr3: "#654321" },
                sunset: { bg1: "#FF6B6B", bg2: "#FF8C42", gr1: "#FFA500", gr2: "#FF6347", gr3: "#DC143C" },
                night: { bg1: "#1a1a2e", bg2: "#0f3460", gr1: "#8B7355", gr2: "#5D3E3E", gr3: "#2d1810" }
            }
        }
    ],

    /**
     * Seleciona um tema e armazena o índice
     * @param {number} themeIndex
     */
    selectTheme(themeIndex) {
        this.currentThemeIndex = themeIndex;
        this.applyVariant("day");
    },

    /**
     * Aplica uma variante do tema atual
     * @param {string} variant
     */
    applyVariant(variant) {
        if (this.currentThemeIndex < 0 || !this.themes[this.currentThemeIndex]) return;

        const theme = this.themes[this.currentThemeIndex];
        const colors = theme.variants[variant];

        if (!colors) return;

        this.currentVariant = variant;

        changeCSSVariable("background-color1", colors.bg1);
        changeCSSVariable("background-color2", colors.bg2);
        changeCSSVariable("ground-color1", colors.gr1);
        changeCSSVariable("ground-color2", colors.gr2);
        changeCSSVariable("ground-color3", colors.gr3);
    },

    /**
     * Determina a variante baseada no score
     * @param {number} score
     * @returns {string}
     */
    getVariantForScore(score) {
        const pointsPerTurn = getPointsPerTurn();
        const cyclePoints = pointsPerTurn * 3;
        const cycleScore = score % cyclePoints;

        if (cycleScore >= pointsPerTurn * 2) return "night";
        if (cycleScore >= pointsPerTurn) return "sunset";
        return "day";
    },

    /**
     * Obtém os textures do tema atual
     * @returns {Object}
     */
    getCurrentTextures() {
        if (this.currentThemeIndex < 0) return null;
        return this.themes[this.currentThemeIndex].textures;
    },

    /**
     * Obtém o emoji do sol/lua para a variante atual
     * @returns {string}
     */
    getCurrentSun() {
        if (this.currentThemeIndex < 0) return "☀️";
        const theme = this.themes[this.currentThemeIndex];
        if (!theme.sun) return "☀️";
        return theme.sun[this.currentVariant] || "☀️";
    }
};

/**
 * Atualiza a variante do tema baseada no score
 * @param {number} score
 */
function updateThemeVariant(score) {
    const targetVariant = ThemeSystem.getVariantForScore(score);
    if (targetVariant !== ThemeSystem.currentVariant) {
        ThemeSystem.applyVariant(targetVariant);
        updateThemeSun();
    }
}

/**
 * Atualiza o emoji do sol/lua baseado na variante atual
 * @returns {void}
 */
function updateThemeSun() {
    if (!solElement) return;
    solElement.innerText = ThemeSystem.getCurrentSun();
}

function processTextures() {
    const c = Math.random() * 100;
    
    let themeIndex;
    // Default reset
    cactusTexture = "🌵";
    dinoTexture = "🦖";
    cloudTexture = "☁️";

    if (c < 5) {
        themeIndex = 0; // sky
    } else if (c < 10) {
        themeIndex = 1; // neon
    } else if (c < 15) {
        themeIndex = 2; // dark
    } else if (c < 35) {
        themeIndex = 3; // forest
    } else {
        themeIndex = 4; // default
    }

    // Seleciona o tema e aplica (começa com "day")
    ThemeSystem.selectTheme(themeIndex);
    
    // Aplica os textures do tema
    const textures = ThemeSystem.getCurrentTextures();
    if (textures) {
        cactusTexture = textures.cactus;
        dinoTexture = textures.dino;
        cloudTexture = textures.cloud;
    }

    dino.innerText = dinoTexture;
    nuvem.innerText = cloudTexture;
}   
function startGame() {
    once();
    processTextures();
    applyDayNightCycleDuration();

    gameStarted = true;
    Session.score = 0;
    Session.rounds++;
    dinoRotation = 0;
    dino.style.setProperty("--rotation", `${dinoRotation}deg`);
    
    // Criar elemento do sol
    if (solElement) {
        solElement.remove();
    }
    solElement = document.createElement('div');
    solElement.classList.add('sol');
    solElement.innerText = ThemeSystem.getCurrentSun();
    board.appendChild(solElement);
    
    document
        .querySelectorAll(".paused")
        .forEach(el => {
            el.classList.remove("paused");
        });
    document
        .querySelectorAll(".cacto")
        .forEach(el => {
            el.remove();
        });
    document
        .querySelectorAll(".nuvem")
        .forEach(el => el.remove());
}
function restartGame() {
    startGame();
    isGameOver = false;
    gameOverMsg.classList.add("hidden");
}

// [[ HANDLERS ]]
/**
 * @param {boolean} spacePressed
 * @returns {void}
 * */
function handleAction(spacePressed) {
    if (gameStarted) {
        jump();
    } else {
        if (isGameOver) {
            if (spacePressed) {
                restartGame();
            }
        } else {
            if (spacePressed) {
                startGame();
            }
        }
    }
}
function handleGameOver() {
    isGameOver = true;
    gameStarted = false;
    
    let score = Session.score;
    Session.total_score += score;
    if (score !== 0) {
        gameOverMsgScoreShower.innerText = score.toString().padStart(5, '0');
    }
    // Session.rounds++;
    saveUserData();
    document
        .querySelectorAll(".nuvem")
        .forEach(n => {
            n.classList.add("paused");
        });
    document
        .querySelectorAll(".cacto")
        .forEach(c => {
            c.classList.add("paused");
        });
    if (solElement) {
        solElement.classList.add("paused");
    }
    dino.classList.add("paused");
    AudioService.playAudio("hit", sfxTrack);
    gameOverMsg.classList.remove('hidden');
}

// [[ FUNÇÕES ]]
function jump() {
    if (jumping) return;
    jumping = true;

    AudioService.playAudio("jump", sfxTrack);

    dino.style.setProperty("--rotation", `${dinoRotation}deg`);

    dino.classList.remove('jump');

    void dino.offsetWidth;

    dino.classList.add('jump');

    setTimeout (() => {
        jumping = false;
        if (!gameStarted) return;
        dino.classList.remove('jump');
        dinoRotation += 180;
        dino.style.setProperty("--rotation", `${dinoRotation}deg`);
    }, 500);
}

checkCollisionInterval = setInterval(() => {
    if (!gameStarted) return;
    checkCollision();
}, 10)

// loop
scoreInterval = setInterval(() => {
    scoreElement.forEach((el) => {
        el.innerText = Session.score.toString().padStart(5, '0');
    })
    maxScoreElement.innerText = Session.max_score.toString().padStart(5, '0');
    
    if (!gameStarted || isGameOver) return;
    
    const prevScore = Session.score;
    Session.score++;
                 
    // Atualiza a variante do tema baseada no score
    updateThemeVariant(Session.score);
    
    if (getBooleanConfig("scoreSounds") && Session.score % 100 === 0) {
        AudioService.playAudio("score", scoTrack);
    }
    
    if (Session.score > Session.max_score) {
        if (!maxScoreElement.classList.contains("green")) {
            console.log("high score!");
            maxScoreElement.classList.add("green");
        }
        Session.max_score = Session.score;

    } else {
        if (maxScoreElement.classList.contains("green")) {
            console.log("low score!");
            maxScoreElement.classList.remove("green");

        }

    }

    if (Session.score == 0) {
        cactusAnimationDuration = 3;
        cactusIntervalDuration = 1750;
        cactusIntervalDurationRandomness = 1000;
    
    } else if (Session.score == 50) {
        cactusAnimationDuration = 2.5;
        cactusIntervalDuration = 1500;
        cactusIntervalDurationRandomness = 1000;

    } else if (Session.score == 100) {
        cactusAnimationDuration = 2.3;
        cactusIntervalDuration = 1250;
        cactusIntervalDurationRandomness = 1000;

    } else if (Session.score == 500) {
        cactusAnimationDuration = 2.1;
        cactusIntervalDuration = 1000;
        cactusIntervalDurationRandomness = 500;

    } else if (Session.score == 1000) {
        cactusAnimationDuration = 2;
        cactusIntervalDuration = 1000;
        cactusIntervalDurationRandomness = 1000;

    }
}, 1000 * scoreIntervalDuration);

function spawnCactus() {
    if (gameStarted && !isGameOver) {
        const cactus = document.createElement('div');
        cactus.classList.add("cacto");
        cactus.innerText = cactusTexture;
        cactus.style.animationDuration = `${cactusAnimationDuration + (Math.random() * cactusAnimationDurationRandomness)}s`;
        board.appendChild(cactus);
        setTimeout(() => {
            if (!gameStarted) return;
            cactus.remove()
        }, 10_000);
    }
    const randomTime = Math.random() * cactusIntervalDurationRandomness + cactusIntervalDuration;
    cactusTimeout = setTimeout(spawnCactus, randomTime);
}
function spawnCloud() {
    if (gameStarted && !isGameOver) {
        const cloud = document.createElement("div");
        
        const scale = Math.random() * cloudScaleRandomness + cloudScale;
        cloud.style.transform = `scale(${scale})`;
        cloud.style.opacity = scale;
        
        cloud.classList.add("nuvem");
        cloud.innerText = cloudTexture;

        // posição vertical aleatória
        const top = Math.random() * 50 + 40;
        cloud.style.setProperty("--cloud-top", `${top}px`);

        cloud.style.animationDuration = `${cloudAnimationDuration + (Math.random() * cloudAnimationDurationRandomness)}s`;

        board.appendChild(cloud);

        // remover depois de um tempo
        const cb = () => {
            if (cloud.classList.contains("paused")) {
                setTimeout(cb, 1000);
                return;
            }
            cloud.remove();
        }
        setTimeout(cb, 20_000);
    }

    const randomTime = Math.random() * cloudIntervalDurationRandomness + cloudIntervalDuration;
    cloudTimeout = setTimeout(spawnCloud, randomTime);
}
function checkCollision() {
    if (!gameStarted) return;
    const dinoRect = dino.getBoundingClientRect();
    const cactuses = document.querySelectorAll('.cacto');

    cactuses.forEach((cactus) => {
        const cactusRect = cactus.getBoundingClientRect();
        const hitbox = {
            top: 10,
            bottom: 15,
            left: 30,
            right: 30
        };

        if (
            dinoRect.right > cactusRect.left + hitbox.left &&
            dinoRect.left < cactusRect.right - hitbox.right &&
            dinoRect.bottom > cactusRect.top + hitbox.top &&
            dinoRect.top < cactusRect.bottom - hitbox.bottom
        ) {
            handleGameOver();
        }
    });
}
