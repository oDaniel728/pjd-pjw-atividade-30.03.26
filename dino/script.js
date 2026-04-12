/**
 * Firebase e Autenticação
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, update, get, onValue, push, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/** @type {Object} Configuração do Firebase */
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

/** @type {Object|null} Usuário autenticado atual */
let usuarioAtual = null;

/** @type {Object|null} Dados do usuário carregados do Firebase */
let dadosUsuario = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    
    usuarioAtual = user;
    await carregarDadosUsuario(user.uid);
});

/**
 * Salva os dados do usuário no Firebase
 * Atualiza usuarios, ranking e histórico
 * @async
 * @returns {Promise<void>}
 */
async function saveUserData() {
    if (!usuarioAtual) return;

    const uid = usuarioAtual.uid;

    const total = Session.total_score;
    const max = Session.max_score;
    const score = Session.score;
    const nivel = Math.floor(total / 500) + 1;

    const data = {
        nome: dadosUsuario.nome,
        total_score: total,
        max_score: max,
        nivel: nivel,
        rounds: Session.rounds,
        score: score
    }

    await set(ref(db, `usuarios/${uid}`), data);
    await set(ref(db, `ranking/${uid}`), data);
    await push(ref(db, `historico/${uid}`), {
        ...data,
        data: new Date().toISOString()
    });
}

/**
 * Carrega dados do usuário do Firebase
 * @async
 * @param {string} uid - ID do usuário
 * @returns {Promise<void>}
 */
async function carregarDadosUsuario(uid) {
    const snapshot = await get(ref(db, `usuarios/${uid}`));

    if (!snapshot.exists()) return;

    const data = snapshot.val();

    dadosUsuario = data;
    Session.total_score = data.total_score || 0;
    Session.max_score = data.max_score || 0;
    Session.rounds = data.rounds || 0;
}

/**
 * Expansor de expressões com suporte a ranges e listas
 */
const Expander = {
    /**
     * Expande uma expressão com ranges [a,b,c] ou a..c
     * @param {string} input - Expressão a expandir
     * @returns {string[]} Array com valores expandidos
     */
    expand(input) {
        const tokens = this.tokenize(input);
        const expanded = tokens.map(t => this.expandToken(t));
        return this.cartesian(expanded);
    },

    /**
     * Tokeniza input respeitando caracteres escapados
     * @param {string} input - String a tokenizar
     * @returns {string[]} Array de tokens
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
     * Expande um token individual
     * @param {string} token - Token para expandir
     * @returns {string[]} Token expandido ou original
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
     * Divide lista respeitando caracteres escapados
     * @param {string} input - String com itens separados por vírgula
     * @returns {string[]} Array de itens da lista
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
     * Expande range numérico ou alfabético
     * @param {string} token - Token com range (ex: 1..3 ou a..c)
     * @returns {string[]} Array com valores do range expandido
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
     * Calcula produto cartesiano de múltiplos arrays
     * @param {string[][]} arrays - Arrays para produto cartesiano
     * @returns {string[]} Resultado do produto cartesiano
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
    /** @type {Map<string, any>} Configuração de áudios */
    config: new Map(),

    /** @type {Map<string, HTMLAudioElement[]>} Cache de áudios carregados */
    cache: new Map(),

    /** @type {Map<string, Set<HTMLAudioElement>>} Áudios ativos por track */
    activeByTrack: new Map(),

    /**
     * Obtém elemento de áudio por nome
     * @param {string} name - Nome do áudio
     * @returns {HTMLAudioElement|null} Elemento de áudio ou null
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
     * Carrega configuração JSON de áudios
     * @async
     * @returns {Promise<Record<string, string|string[]>>} Configuração de áudios
     */
    async getAudioConfig() {
        const res = await fetch("./assets/soundconfig.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },

    /**
     * Inicializa configuração e carrega todos os áudios
     * @async
     * @returns {Promise<void>}
     */
    async updateConfig() {
        this.config = new Map(
            Object.entries(await this.getAudioConfig())
        );

        await this.preloadAll();
    },

    /**
     * Resolve caminhos de áudio baseado na configuração
     * @param {string} name - Nome do áudio
     * @returns {string[]} Array de caminhos de áudio
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
     * Carrega todos os áudios configurados
     * @async
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
     * Carrega áudios específicos por nome
     * @async
     * @param {string} name - Nome do áudio
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
     * Registra áudio ativo para rastreamento
     * @param {string} trackName - Nome da track
     * @param {HTMLAudioElement} audio - Elemento de áudio
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
     * Toca um áudio aleatório do pool
     * @param {string} name - Nome do áudio
     * @param {string|HTMLAudioElement} track - Track ou nome da track
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
     * Define volume de uma track incluindo áudios ativos
     * @param {string} trackName - Nome da track
     * @param {number} volume - Volume (0-1)
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

/**
 * Serviço de playlists para gerenciar sequências de áudio
 */
const PlaylistService = {
    /** @type {Map<string, Playlist>} Playlists ativas */
    playlists: new Map(),

    /**
     * Cria uma nova playlist
     * @param {string} name - Nome da playlist
     * @param {string[]} audios - Array de nomes de áudios
     * @param {PlaylistOptions} [options] - Opções da playlist
     * @returns {string} Nome da playlist criada
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
     * Inicia reprodução de uma playlist
     * @param {string} name - Nome da playlist
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
     * Para a reprodução de uma playlist
     * @param {string} name - Nome da playlist
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
     * Reproduz próxima musik da playlist
     * @param {string} name - Nome da playlist
     */
    next(name) {
        const pl = this.playlists.get(name);
        if (!pl) return;

        this._advance(pl);
        this._playCurrent(pl);
    },

    /**
     * Avança para próximo índice da playlist
     * @param {Playlist} pl - Playlist
     * @private
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
     * Reproduz áudio atual da playlist
     * @param {Playlist} pl - Playlist
     * @private
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

/**
 * Gerenciador de configurações persistentes em localStorage
 */
const Config = {
    /** @type {string} Chave de armazenamento */
    key: "config",
    
    /** @type {boolean} Config foi carregado */
    loaded: false,
    
    /** @type {Object} Dados da configuração */
    data: {},

    /**
     * Carrega configurações do localStorage
     * @returns {Object} Dados carregados
     */
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

    /**
     * Salva configurações no localStorage
     */
    save() {
        localStorage.setItem(this.key, JSON.stringify(this.data));
    },

    /**
     * Obtém valor da configuração
     * @param {string} name - Nome da configuração
     * @param {*} fallback - Valor padrão
     * @returns {*} Valor da configuração ou fallback
     */
    get(name, fallback = null) {
        return Object.hasOwn(this.data, name)
            ? this.data[name]
            : fallback;
    },

    /**
     * Define valor da configuração
     * @param {string} name - Nome da configuração
     * @param {*} value - Valor a armazenar
     */
    set(name, value) {
        this.data[name] = value;
        this.save();
    },

    /**
     * Define valor padrão se não existir
     * @param {string} name - Nome da configuração
     * @param {*} value - Valor padrão
     */
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

/**
 * Gerenciador de dados da sessão de jogo
 */
const Session = {
    /** @type {string[]} Campos temporários */
    temporary: ["temporary", "score", "auto_saving", "loaded"],
    
    /** @type {number} Pontuação da partida atual */
    score: 0,
    
    /** @type {number} Pontuação total acumulada */
    total_score: 0,
    
    /** @type {number} Pontuação máxima atingida */
    max_score: 0,
    
    /** @type {number} Quantidade de rodadas jogadas */
    rounds: 0,

    /** @type {boolean} Auto-save ativado */
    auto_save: false,
    
    /** @type {boolean} Salvando dados */
    auto_saving: false,
    
    /** @type {boolean} Session foi carregada */
    loaded: false,

    /** @type {Function} Função de salvamento assíncrono */
    aSave: saveUserData,
    
    /**
     * Salva dados da sessão
     */
    save() {
        localStorage.setItem(
            "session", JSON.stringify(this)
        );
        console.log(JSON.stringify(this));
        this.aSave();
    },
    
    /**
     * Carrega dados da sessão
     */
    load() {
        if (this.loaded) return;
        this.loaded = true;
    },
    
    /**
     * Inicia salvamento automático
     * @private
     */
    _startAutoSave() {
        if (this.auto_saving) return;
        this.auto_saving = true;
        setInterval(() => {
            this._autoSaveHandler();
        }, 1000)
    },
    
    /**
     * Handler de salvamento automático
     * @private
     */
    _autoSaveHandler() {
        if (!this.auto_save) return;
        this.save();
    }
}

/**
 * Referências de elementos do DOM
 */
const dino = document.querySelector('.dino');
const nuvem = document.querySelector(".nuvem");
const board = document.getElementById('game-board');
const scoreElement = document.querySelectorAll('.score-show');
const maxScoreElement = document.getElementById('max-score');
const startMsg = document.getElementById('start-msg');
const gameOverMsg = document.querySelector('.gameOverMsg');
const gameOverMsgScoreShower = document.querySelector(".score-show-gameover");
const configElements = document.querySelectorAll("[data-config]");

/** @type {HTMLElement|null} Elemento do sol/lua */
let solElement = null;

/**
 * Altera uma variável CSS
 * @param {string} name - Nome da variável
 * @param {any} value - Novo valor
 */
function changeCSSVariable(name, value) {
    document.documentElement.style.setProperty(`--${name}`, value.toString());
}

/**
 * Obtém o valor de uma variável CSS
 * @param {string} name - Nome da variável
 * @param {HTMLElement} [el] - Elemento a consultar
 * @returns {string} Valor da variável CSS
 */
function getCSSVariable(name, el = document.documentElement) {
    return getComputedStyle(el)
        .getPropertyValue(`--${name}`)
        .trim();
}

/** @type {HTMLAudioElement|null} Track de efeitos sonoros */
const sfxTrack = AudioService.getAudioTrack("sfx");

/** @type {HTMLAudioElement|null} Track de música de fundo */
const bgmTrack = AudioService.getAudioTrack("bgm");

/** @type {HTMLAudioElement|null} Track de sound efeitos de pontuação */
const scoTrack = AudioService.getAudioTrack("sco");

/** @type {number} Volume padrão de SFX */
const defaultSfxVolume = 0.5;

/** @type {number} Volume padrão de BGM */
const defaultBgmVolume = 0.2;

/**
 * Obtém valor booleano da configuração
 * @param {string} key - Chave da configuração
 * @returns {boolean} Valor booleano
 */
function getBooleanConfig(key) {
    const value = Config.get(key, false);

    if (typeof value === "boolean") return value;

    const normalized = Boolean(value);
    Config.set(key, normalized);
    return normalized;
}

/**
 * Renderiza elemento de configuração
 * @param {HTMLElement} container - Container do elemento
 * @param {boolean} isActive - Se está ativo
 */
function renderConfigElement(container, isActive) {
    const activatedEl = container.querySelector(".activated");
    const deactivatedEl = container.querySelector(".deactivated");

    if (activatedEl) activatedEl.classList.toggle("hidden", !isActive);
    if (deactivatedEl) deactivatedEl.classList.toggle("hidden", isActive);

    container.setAttribute("aria-pressed", String(isActive));
}

/**
 * Aplica efeito de configuração
 * @param {string} key - Chave da configuração
 * @param {boolean} value - Novo valor
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
 * Liga elementos UI com configurações booleanas
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

/**
 * Variáveis de estado do jogo
 */

/** @type {boolean} Indica se o jogo terminou */
let isGameOver = false;

/** @type {number|null} ID do intervalo de pontuação */
let scoreInterval;

/** @type {number|null} ID do intervalo de colisão */
let checkCollisionInterval;

/** @type {boolean} Indica se o dinossauro está pulando */
let jumping = false;

/** @type {boolean} Indica se o jogo foi iniciado */
let gameStarted = false;

/** @type {boolean} Indica se música está tocando */
let musicPlaying = false;

/** @type {number|null} ID do timeout dos cactos */
let cactusTimeout;

/** @type {number} Duração da animação dos cactos */
let cactusAnimationDuration = 3;

/** @type {number} Aleatoriedade na duração dos cactos */
let cactusAnimationDurationRandomness = 0;

/** @type {number} Intervalo entre aparições de cactos (ms) */
let cactusIntervalDuration = 2000;

/** @type {number} Aleatoriedade do intervalo de cactos (ms) */
let cactusIntervalDurationRandomness = 500;

/** @type {number|null} ID do timeout das nuvens */
let cloudTimeout;

/** @type {number} Duração da animação das nuvens */
let cloudAnimationDuration = 10;

/** @type {number} Aleatoriedade da duração das nuvens */
let cloudAnimationDurationRandomness = 10;

/** @type {number} Intervalo entre aparições de nuvens (ms) */
let cloudIntervalDuration = 1500;

/** @type {number} Aleatoriedade do intervalo de nuvens (ms) */
let cloudIntervalDurationRandomness = 500;

/** @type {number} Escala das nuvens */
let cloudScale = 1;

/** @type {number} Aleatoriedade da escala das nuvens */
let cloudScaleRandomness = 1;

/** @type {number} Rotação do dinossauro em graus */
let dinoRotation = 0;

/** @type {number} Duração do ciclo dia/noite em segundos */
const daynightCycleDuration = 30;

/** @type {number} Intervalo de pontuação em segundos */
const scoreIntervalDuration = 0.10;

/** @type {string} Textura do cacto */
let cactusTexture = "🌵";

/** @type {string} Textura do dinossauro */
let dinoTexture = "🦖";

/** @type {string} Textura da nuvem */
let cloudTexture = "☁️";

/** @type {string} Cor padrão de fundo 1 */
const defaultBackgroundColor1 = getCSSVariable("background-color1");

/** @type {string} Cor padrão de fundo 2 */
const defaultBackgroundColor2 = getCSSVariable("background-color2");

/** @type {string} Cor padrão do chão 1 */
const defaultGroundColor1 = getCSSVariable("ground-color1");

/** @type {string} Cor padrão do chão 2 */
const defaultGroundColor2 = getCSSVariable("ground-color2");

/** @type {string} Cor padrão do chão 3 */
const defaultGroundColor3 = getCSSVariable("ground-color3");

/**
 * Aplica duração do ciclo dia/noite
 */
function applyDayNightCycleDuration() {
    changeCSSVariable("daynight-cycle-duration", `${daynightCycleDuration}s`);
}

/**
 * Calcula pontos necessários para trocar de turno (day -> sunset -> night)
 * @returns {number} Pontos por turno
 */
function getPointsPerTurn() {
    if (scoreIntervalDuration <= 0) return 1;
    return Math.max(1, Math.round(daynightCycleDuration / scoreIntervalDuration));
}

applyDayNightCycleDuration();

/**
 * Inicialização de spawners de cactos e nuvens
 */
const randomTime = Math.random() * cactusIntervalDurationRandomness + cactusIntervalDuration;
cactusTimeout = setTimeout(spawnCactus, randomTime);

const randomCloudTime = Math.random() * cloudIntervalDurationRandomness + cloudIntervalDuration;
cloudTimeout = setTimeout(spawnCloud, randomCloudTime);

/**
 * Event listeners de entrada
 */
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

/**
 * Inicia música de fundo
 */
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
});

document.addEventListener("beforeunload", () => {
    Session.save();
});

/**
 * Executa música uma única vez
 */
function once() {
    if (musicPlaying) return;
    startBackgroundMusic();
}

/**
 * Sistema de temas com variantes dia/noite/entardecer
 */
const ThemeSystem = {
    /** @type {number} Índice do tema atual */
    currentThemeIndex: -1,
    
    /** @type {string} Variante atual (day, sunset, night) */
    currentVariant: "day",

    /** @type {Array} Lista de temas disponíveis */
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
     * Seleciona um tema por índice
     * @param {number} themeIndex - Índice do tema
     */
    selectTheme(themeIndex) {
        this.currentThemeIndex = themeIndex;
        this.applyVariant("day");
    },

    /**
     * Aplica variante do tema atual
     * @param {string} variant - Variante (day, sunset, night)
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
     * Obtém variante apropriada para a pontuação
     * @param {number} score - Pontuação atual
     * @returns {string} Variante (day, sunset, night)
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
     * Obtém texturas do tema atual
     * @returns {Object} Texturas (cacto, dino, nuvem)
     */
    getCurrentTextures() {
        if (this.currentThemeIndex < 0) return null;
        return this.themes[this.currentThemeIndex].textures;
    },

    /**
     * Obtém emoji do sol/lua para variante atual
     * @returns {string} Emoji do sol ou lua
     */
    getCurrentSun() {
        if (this.currentThemeIndex < 0) return "☀️";
        const theme = this.themes[this.currentThemeIndex];
        if (!theme.sun) return "☀️";
        return theme.sun[this.currentVariant] || "☀️";
    }
};

/**
 * Atualiza variante do tema baseada na pontuação
 * @param {number} score - Pontuação atual
 */
function updateThemeVariant(score) {
    const targetVariant = ThemeSystem.getVariantForScore(score);
    if (targetVariant !== ThemeSystem.currentVariant) {
        ThemeSystem.applyVariant(targetVariant);
        updateThemeSun();
    }
}

/**
 * Atualiza emoji do sol/lua baseado na variante atual
 */
function updateThemeSun() {
    if (!solElement) return;
    solElement.innerText = ThemeSystem.getCurrentSun();
}

/**
 * Processa e aplica texturas aleatórias do tema
 */
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

/**
 * Inicia uma nova partida
 */
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

/**
 * Handlers de eventos do jogo
 */

/**
 * Handler de ação do jogador (pular ou iniciar jogo)
 * @param {boolean} spacePressed - Se foi acionado por teclado
 */
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

/**
 * Handler de fim de jogo
 */
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

/**
 * Funções do jogo
 */

/**
 * Faz o dinossauro pular
 */
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

/**
 * Loop de verificação de colisões
 */
checkCollisionInterval = setInterval(() => {
    if (!gameStarted) return;
    checkCollision();
}, 10);

/**
 * Loop principal de pontuação e atualização do jogo
 */
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

/**
 * Spawnea um novo cacto na tela
 */
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

/**
 * Spawnea uma nova nuvem na tela
 */
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

/**
 * Verifica colisão entre dinossauro e cactos
 */
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
