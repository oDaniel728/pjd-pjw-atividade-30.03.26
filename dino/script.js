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

    // 1. dados principais do usuário
    await set(ref(db, `usuarios/${uid}`), {
        nome: dadosUsuario.nome,
        total_score: total,
        max_score: max,
        nivel: nivel,
        rounds: Session.rounds,
    });

    // 2. ranking separado (evita bagunça no users)
    await set(ref(db, `ranking/${uid}`), {
        nome: dadosUsuario.nome,
        total_score: total,
        max_score: max,
        nivel: nivel,
        rounds: Session.rounds,
    });

    // 3. histórico (sempre append)
    await push(ref(db, `historico/${uid}`), {
        score: Session.score,
        total_score: total,
        max_score: max,
        nivel: nivel,
        rounds: Session.rounds,
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
        }

        if (!track) return;

        const base = pool[Math.floor(Math.random() * pool.length)];

        const audio = /** @type {HTMLAudioElement} */ (track.cloneNode());

        audio.src = base.src;
        audio.volume = track.volume;
        audio.currentTime = 0;

        this._register(trackName, audio);

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

        audio.src = base.src;
        audio.volume = pl.track.volume;
        audio.currentTime = 0;

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

// [[ VARIÁVEIS ]]
let isGameOver = false;
let scoreInterval;
let checkCollisionInterval;
let jumping = false;
let gameStarted = false;
let musicPlaying = false;

let cactusTimeout;
let cactusAnimationDuration = "3s";
let cactusIntervalDuration = 2000;
let cactusIntervalDurationRandomness = 500;

let cloudTimeout;
let cloudAnimationDuration = "15s";
let cloudIntervalDuration = 1500;
let cloudIntervalDurationRandomness = 500;
let cloudScale = 1;
let cloudScaleRandomness = 1;

let cactusTexture = "🌵";
let dinoTexture = "🦖";
let cloudTexture = "☁️";

const defaultBackgroundColor = getCSSVariable("background-color");
const defaultGroundColor1 = getCSSVariable("ground-color1");
const defaultGroundColor2 = getCSSVariable("ground-color2");

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
    AudioService.setTrackVolume("bgm", 0.5);

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
function processTextures() {
    const c = Math.random() * 100;
    
    cactusTexture = "🌵";
    dinoTexture = "🦖";
    cloudTexture = "☁️";

    changeCSSVariable("background-color", defaultBackgroundColor);
    changeCSSVariable("ground-color1", defaultGroundColor1);
    changeCSSVariable("ground-color2", defaultGroundColor2);

    // --background-color: #87CEEB;;
    // --ground-color1: #C4A95A;
    // --ground-color2: #8B7355;
    if (c < 5) {
        cactusTexture = "🦖";
        dinoTexture = "🌵";
        cloudTexture = "☀️";
        
        changeCSSVariable("background-color", "#C4A95A");
        changeCSSVariable("ground-color1", "#87CEEB");
        changeCSSVariable("ground-color2", "#528db7");
    } else
    if (c < 10) {
        cactusTexture = "🔺";
        dinoTexture = "🟨";
        cloudTexture = "⬜◽";
        
        changeCSSVariable("background-color", "#6797fe");
        changeCSSVariable("ground-color1", "#8250eb");
        changeCSSVariable("ground-color2", "#4e2673");
    } else
    if (c < 20) {
        cactusTexture = "🌳";
        dinoTexture = "🦕";
        cloudTexture = "🌧️";

        changeCSSVariable("background-color", "#201f2d");
        changeCSSVariable("ground-color1", "#03491b");
        changeCSSVariable("ground-color2", "#003000");
    }
    dino.innerText = dinoTexture;
    nuvem.innerText = cloudTexture;
}   
function startGame() {
    once();
    processTextures();

    gameStarted = true;
    Session.score = 0;
    Session.rounds++;
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
    Session.rounds++;
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
    AudioService.playAudio("hit", sfxTrack);
    gameOverMsg.classList.remove('hidden');
    saveUserData();
}

// [[ FUNÇÕES ]]
function jump() {
    if (jumping) return;
    jumping = true;

    AudioService.playAudio("jump", sfxTrack);

    dino.classList.remove('jump');

    void dino.offsetWidth;

    dino.classList.add('jump');

    setTimeout (() => {
        jumping = false;
        dino.classList.remove('jump');
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
    Session.score++;
    
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
        cactusAnimationDuration = "3s";
        cactusIntervalDuration = 2000;
        cactusIntervalDurationRandomness = 500;
    
    } else if (Session.score == 100) {
        cactusAnimationDuration = "2.9s";
        cactusIntervalDuration = 2000;
        cactusIntervalDurationRandomness = 500;

    } else if (Session.score == 500) {
        cactusAnimationDuration = "2.8s";
        cactusIntervalDuration = 2000;
        cactusIntervalDurationRandomness = 500;

    } else if (Session.score == 1000) {
        cactusAnimationDuration = "2.7s";
        cactusIntervalDuration = 2000;
        cactusIntervalDurationRandomness = 500;

    } else if (Session.score == 2000) {
        cactusAnimationDuration = "2.6s";
        cactusIntervalDuration = 1750;
        cactusIntervalDurationRandomness = 1000;

    }
}, 100);

function spawnCactus() {
    if (gameStarted && !isGameOver) {
        const cactus = document.createElement('div');
        cactus.classList.add("cacto");
        cactus.innerText = cactusTexture;
        cactus.style.animationDuration = cactusAnimationDuration;
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
        const top = Math.random() * 100 + 20; // entre 20px e 120px
        cloud.style.top = `${top}px`;

        cloud.style.animationDuration = cloudAnimationDuration;

        board.appendChild(cloud);

        // remover depois de um tempo
        setTimeout(() => {
            cloud.remove();
        }, 20000);
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
            top: 20,
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
