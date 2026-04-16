/**
 * Firebase e Autenticação
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, update, get, onValue, push, child, remove, query, orderByKey, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/** @typedef {import("./types.d.ts").GameThemeTextures} GameThemeTextures */
/** @typedef {import("./types.d.ts").GameThemeSun} GameThemeSun */
/** @typedef {import("./types.d.ts").GameThemeVariantColors} GameThemeVariantColors */
/** @typedef {import("./types.d.ts").GameThemeVariants} GameThemeVariants */
/** @typedef {import("./types.d.ts").GameThemeSkyCloudSounds} GameThemeSkyCloudSounds */
/** @typedef {import("./types.d.ts").GameThemeSkySunSounds} GameThemeSkySunSounds */
/** @typedef {import("./types.d.ts").GameThemeSkySounds} GameThemeSkySounds */
/** @typedef {import("./types.d.ts").GameThemeSounds} GameThemeSounds */
/** @typedef {import("./types.d.ts").GameTheme} GameTheme */
/** @typedef {import("./types.d.ts").Playlist} Playlist */
/** @typedef {import("./types.d.ts").PlaylistOptions} PlaylistOptions */

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

/** @type {boolean} Indica se dados iniciais ainda estão carregando */
let isDatabaseLoading = true;

/** @type {string[]} Emojis possíveis para o loading spinner */
const loadingSpinnerEmojis = ["🐍", "🦖", "🦕", "🌵", "☁️", "⚡", "🔥", "✨", "🎮"];

/**
 * Sorteia um emoji para o spinner da tela de loading
 * @returns {string} Emoji selecionado
 */
function getRandomLoadingSpinnerEmoji() {
    const index = Math.floor(Math.random() * loadingSpinnerEmojis.length);
    return loadingSpinnerEmojis[index];
}

/**
 * Atualiza visibilidade da tela de loading
 * @param {boolean} isLoading - Se está carregando
 */
function setDatabaseLoadingState(isLoading) {
    isDatabaseLoading = isLoading;

    const loadingSpinnerEl = document.getElementById("loadingSpinner");
    const loadingScreenEl = document.getElementById("loadingScreen");

    if (loadingSpinnerEl) {
        loadingSpinnerEl.innerText = getRandomLoadingSpinnerEmoji();
    }

    if (!loadingScreenEl) return;
    loadingScreenEl.classList.toggle("transparent", !isLoading);
}

setDatabaseLoadingState(true);

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    
    usuarioAtual = user;

    try {
        await carregarDadosUsuario(user.uid);
    } finally {
        setDatabaseLoadingState(false);
    }
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
    const maxHistorico = 50;

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
    const historicoRef = ref(db, `historico/${uid}`);
    await push(historicoRef, {
        ...data,
        data: new Date().toISOString()
    });

    const snapshotHistorico = await get(query(historicoRef, orderByKey(), limitToLast(maxHistorico + 1)));
    if (!snapshotHistorico.exists()) return;

    const entradas = Object.entries(snapshotHistorico.val());
    if (entradas.length <= maxHistorico) return;

    const itensExcedentes = entradas.slice(0, entradas.length - maxHistorico);
    await Promise.all(itensExcedentes.map(([chave]) => remove(ref(db, `historico/${uid}/${chave}`))));
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
        if (!name) return;

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
const gameOverMsg = document.querySelector('#game-over-msg');
const gameOverMsgScoreShower = document.querySelector(".score-show-gameover");
const gameOverPhrase = document.querySelector("p#phrase");
const gameOverRecord = document.querySelector("p#record");
const configElements = document.querySelectorAll("[data-config]");
const chao = document.querySelector(".chao");

/** @type {HTMLElement|null} Elemento do sol/lua */
let solElement = null;

/**
 * Altera uma variável CSS
 * @param {string} name - Nome da variável
 * @param {any} value - Novo valor
 * @param {HTMLElement} [object=document.documentElement] - Elemento alvo (padrão: root)
 */
function changeCSSVariable(name, value, object = document.documentElement) {
    object.style.setProperty(`--${name}`, value.toString());
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

/**
 * Lê e parseia frases da variável CSS --possible-phrases
 * @returns {string[]} Frases disponíveis
 */
function getPossiblePhrasesFromCSS() {
    const raw = getCSSVariable("possible-phrases");
    if (!raw) return [];

    return raw
        .split("|")
        .map((part) => part.trim())
        .map((part) => part.replace(/^"|"$/g, ""))
        .filter(Boolean);
}

/**
 * Sorteia uma frase da lista de frases possíveis
 * @returns {string} Frase sorteada
 */
function getRandomGameOverPhrase() {
    const phrases = getPossiblePhrasesFromCSS();
    if (phrases.length === 0) return "Na próxima você consegue!";

    const index = Math.floor(Math.random() * phrases.length);
    return phrases[index];
}

/** @type {string} Duração padrão da animação de pulo */
const defaultDinoJumpAnimationDuration = getCSSVariable("dino-jump-animation-duration") || "0.5s";

/**
 * Converte a duração CSS do pulo para milissegundos
 * @returns {number} Duração em ms
 */
function getDinoJumpAnimationDurationMs() {
    const duration = getCSSVariable("dino-jump-animation-duration") || defaultDinoJumpAnimationDuration;
    const parsed = Number.parseFloat(duration);

    return Number.isFinite(parsed) ? parsed * 1000 : 500;
}

/**
 * Define a duração da animação de pulo do dinossauro
 * @param {string} duration - Duração CSS
 */
function setDinoJumpAnimationDuration(duration) {
    changeCSSVariable("dino-jump-animation-duration", duration);
}

/**
 * Duração entre passos do dino baseada na velocidade do cacto
 * @returns {number} Intervalo em ms
 */
function getDinoFootstepIntervalMs() {
    const steps = Math.max(1, footstepsPerAnimation);
    return Math.max(120, Math.round((cactusAnimationDuration * 1000) / steps));
}

/**
 * Cancela a agenda atual de passos do dino
 */
function clearDinoFootsteps() {
    if (!dinoFootstepTimeout) return;

    clearTimeout(dinoFootstepTimeout);
    dinoFootstepTimeout = null;
}

/**
 * Agenda o próximo passo do dino
 */
function scheduleDinoFootsteps() {
    clearDinoFootsteps();

    const tick = () => {
        if (!gameStarted || isGameOver) {
            dinoFootstepTimeout = null;
            return;
        }

        if (!jumping && !crouching && dinoWalkSoundEffect) {
            AudioService.playAudio(dinoWalkSoundEffect, sfxTrack);
            dinoFootstepTimeout = setTimeout(tick, getDinoFootstepIntervalMs());
            return;
        }

        dinoFootstepTimeout = setTimeout(tick, 120);
    };

    dinoFootstepTimeout = setTimeout(tick, getDinoFootstepIntervalMs());
}

const crouchKeys = new Set(["ShiftLeft", "ShiftRight", "KeyS", "ArrowDown"]);

function startCrouch() {
    if (isDatabaseLoading) return;
    if (!dino || !gameStarted || isGameOver) return;
    if (crouching) return;

    crouching = true;
    dino.classList.add("crouch");
    setDinoJumpAnimationDuration("0.2s");

    if (dinoCrouchSoundEffect) {
        AudioService.playAudio(dinoCrouchSoundEffect, sfxTrack);
    }
}

function stopCrouch() {
    if (!dino) return;

    crouching = false;
    dino.classList.remove("crouch");
    setDinoJumpAnimationDuration(defaultDinoJumpAnimationDuration);
}

/**
 * Faz o chão tremer rapidamente ao aterrissar
 */
function triggerGroundImpact() {
    if (!chao) return;

    const groundShakeSound = ThemeSystem.getCurrentThemeSound(["ground", "groundShake"]);
    if (groundShakeSound) {
        AudioService.playAudio(groundShakeSound, sfxTrack);
    }

    chao.classList.remove("u-vibrate");
    void chao.offsetWidth;
    chao.classList.add("u-vibrate");

    chao.addEventListener(
        "animationend",
        () => {
            chao.classList.remove("u-vibrate");
        },
        { once: true }
    );
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
            if (isDatabaseLoading) return;
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

/** @type {boolean} Indica se o dinossauro está agachado */
let crouching = false;

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

/** @type {(event: AnimationEvent) => void | null} Handler ativo do fim do pulo */
let jumpAnimationEndHandler = null;

/** @type {number} Recorde no início da rodada */
let maxScoreAtGameStart = 0;

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

/** @type {string} Efeito sonoro para spawn de cactos */
let cactusSpawnSoundEffect = "cactus";

/** @type {string|null} Efeito sonoro para spawn de nuvens */
let cloudSpawnSoundEffect = null;

/** @type {string|null} Efeito sonoro a cada 100 pontos */
let scoreHundredSoundEffect = "score";

/** @type {string|null} Efeito sonoro a cada 1000 pontos */
let scoreThousandSoundEffect = null;

/** @type {string|null} Efeito sonoro do pulo */
let dinoJumpSoundEffect = "jump";

/** @type {string|null} Efeito sonoro ao aterrissar */
let dinoLandSoundEffect = null;

/** @type {string|null} Efeito sonoro ao agachar */
let dinoCrouchSoundEffect = null;

/** @type {string|null} Efeito sonoro ao morrer */
let dinoDeathSoundEffect = "hit";

/** @type {string|null} Efeito sonoro do passo do dino */
let dinoWalkSoundEffect = "stone";

/** @type {string|null} ID da música de fundo do tema atual */
let currentThemeBackgroundMusic = "bg-song";

/** @type {string|null} Nome do tema da playlist ativa */
let activeThemeForBgm = null;

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

/** @type {number} Passos por animação do cacto */
let footstepsPerAnimation = 5;

/** @type {number|null} ID do timeout dos passos do dino */
let dinoFootstepTimeout;

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
// maxScoreElement.addEventListener("animationend", (ev) => {
//     if (ev.animationName === "max-score-gain-anim") {
//         maxScoreElement.classList.remove("max-score-gain");
//     }
// });
document.addEventListener("keydown", (event) => {
    if (isDatabaseLoading) {
        const target = event.target;
        const isMenuLink = target instanceof Element && target.closest(".menu-jogo a");
        if (isMenuLink) return;

        event.preventDefault();
        return;
    }

    if (crouchKeys.has(event.code)) {
        event.preventDefault();
        startCrouch();
        return;
    }

    if (
        event.code === 'Space' ||
        event.code === "ArrowUp" || // Questão 3
        event.code === "KeyW"
    ) {
        handleAction(true);
    }
});

document.addEventListener("keyup", (event) => {
    if (isDatabaseLoading) return;
    if (!crouchKeys.has(event.code)) return;
    stopCrouch();
});

board.addEventListener('pointerdown', () => {
    if (isDatabaseLoading) return;
    handleAction(false);
});

/**
 * Inicia música de fundo
 */
function startBackgroundMusic() {
    AudioService.setTrackVolume(
        "sfx",
        getBooleanConfig("sfxActivated") ? defaultSfxVolume : 0
    );
    AudioService.setTrackVolume(
        "bgm",
        getBooleanConfig("bgmActivated") ? defaultBgmVolume : 0
    );

    if (musicPlaying) return;
    musicPlaying = true;

    playThemeBackgroundMusic();
}

function playThemeBackgroundMusic() {
    if (!musicPlaying || !bgmTrack) return;

    const theme = ThemeSystem.getCurrentTheme();
    const themeName = theme?.name || "default";
    const trackId = currentThemeBackgroundMusic;

    if (!trackId) return;
    if (activeThemeForBgm === themeName) return;

    PlaylistService.stop("bgm-theme");
    PlaylistService.create(
        "bgm-theme",
        [trackId],
        {
            loop: true,
            track: bgmTrack
        }
    );
    PlaylistService.play("bgm-theme");

    activeThemeForBgm = themeName;
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

    /** @type {string|null} Variante alvo durante transição */
    transitionTarget: null,

    /** @type {GameTheme[]} Lista de temas disponíveis */
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
            sun: { day: " ", sunset: " ", night: " " },
            variants: {
                day: { bg1: "#6797fe", bg2: "#3a5fb0", gr1: "#8250eb", gr2: "#4e2673", gr3: "#2b1340" },
                sunset: { bg1: "#FF6B6B", bg2: "#FFA500", gr1: "#FF4D6D", gr2: "#C1121F", gr3: "#780000" },
                night: { bg1: "#0a0e27", bg2: "#16213e", gr1: "#5a189a", gr2: "#3c096c", gr3: "#240046" }
            }
        },
        {
            name: "dark",
            textures: { cactus: "🔥", dino: "💧", cloud: "☁️" },
            sounds: {
                cactus: {
                    cactusSpawn: "fire",
                    cactusDespawn: "fire_ext"
                }
            },
            sun: { day: " ", sunset: " ", night: " " },
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
            sounds: {
                cactus: {
                    cactusSpawn: "wood",
                    cactusDespawn: "grass"
                }
            },
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
            sounds: {
                game: {
                    scoreHundred: "exp",
                    scoreThousand: "levelup",
                    backgroundMusic: "bg-song",
                },
                cactus: {
                    cactusSpawn: "cactus",
                    cactusDespawn: "grass",
                },
                dino: {
                    dinoJump: "jump",
                    dinoLand: "fall",
                    dinoCrouch: null,
                    dinoDeath: "hit",
                    dinoWalk: "stone",
                },
                ground: {
                    groundShake: "sand",
                },
                sky: {
                    cloud: {
                        cloudSpawn: "snow",
                        cloudDespawn: null,
                    },
                    sun: {
                        dayStarted: null,
                        dayEnded: null,

                        sunsetStarted: null,
                        sunsetEnded: null,

                        nightStarted: null,
                        nightEnded: null
                    }
                }
            },
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
     * Obtém o tema atual
     * @returns {GameTheme} Tema atual
     */
    getCurrentTheme() {
        return this.themes[this.currentThemeIndex] || this.themes[0];
    },

    /**
     * Obtém o tema padrão (nome default)
     * @returns {GameTheme} Tema padrão
     */
    getDefaultTheme() {
        return this.themes.find((theme) => theme.name === "default") || this.themes[0];
    },

    /**
     * Lê um som do tema por caminho
     * @param {GameTheme} theme - Tema de origem
     * @param {string[]} path - Caminho de propriedades
     * @returns {string|null|undefined} Som encontrado
     */
    readThemeSound(theme, path) {
        let value = theme?.sounds;

        for (const key of path) {
            if (!value || typeof value !== "object") return undefined;
            value = value[key];
        }

        return value;
    },

    /**
     * Obtém som do tema atual com fallback para o tema default
     * @param {string[]} path - Caminho de propriedades
     * @returns {string|null} Nome do áudio
     */
    getCurrentThemeSound(path) {
        const currentThemeValue = this.readThemeSound(this.getCurrentTheme(), path);
        if (currentThemeValue !== undefined && currentThemeValue !== null) {
            return currentThemeValue;
        }

        const defaultThemeValue = this.readThemeSound(this.getDefaultTheme(), path);
        return defaultThemeValue ?? null;
    },

    /**
     * Obtém texturas do tema atual
     * @returns {Object} Texturas (cacto, dino, nuvem)
     */
    getCurrentTextures() {
        return this.getCurrentTheme().textures;
    },

    /**
     * Obtém emoji do sol/lua para variante atual
     * @returns {string} Emoji do sol ou lua
     */
    getCurrentSun() {
        const theme = this.getCurrentTheme();
        if (!theme.sun) return "☀️";
        return theme.sun[this.currentVariant] || "☀️";
    }
};

/**
 * Anima transição suave de cores entre variantes
 * @param {string} fromVariant - Variante atual
 * @param {string} toVariant - Variante destino
 * @param {number} duration - Duração da transição em ms
 */
function animateThemeTransition(fromVariant, toVariant, duration = 5000) {
    if (ThemeSystem.currentThemeIndex < 0) return;
    if (ThemeSystem.transitionTarget === toVariant) return;

    const theme = ThemeSystem.themes[ThemeSystem.currentThemeIndex];
    const fromColors = theme.variants[fromVariant];
    const toColors = theme.variants[toVariant];

    if (!fromColors || !toColors) return;

    ThemeSystem.transitionTarget = toVariant;
    ThemeSystem.currentVariant = toVariant;
    updateThemeSun();

    const startTime = Date.now();
    const startColors = {
        bg1: fromColors.bg1,
        bg2: fromColors.bg2,
        gr1: fromColors.gr1,
        gr2: fromColors.gr2,
        gr3: fromColors.gr3
    };

    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const interpolateColor = (from, to, t) => {
            const fromRgb = parseInt(from.slice(1), 16);
            const toRgb = parseInt(to.slice(1), 16);

            const r1 = (fromRgb >> 16) & 255;
            const g1 = (fromRgb >> 8) & 255;
            const b1 = fromRgb & 255;

            const r2 = (toRgb >> 16) & 255;
            const g2 = (toRgb >> 8) & 255;
            const b2 = toRgb & 255;

            const r = Math.round(r1 + (r2 - r1) * t);
            const g = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);

            return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        };

        const currentBg1 = interpolateColor(startColors.bg1, toColors.bg1, progress);
        const currentBg2 = interpolateColor(startColors.bg2, toColors.bg2, progress);
        const currentGr1 = interpolateColor(startColors.gr1, toColors.gr1, progress);
        const currentGr2 = interpolateColor(startColors.gr2, toColors.gr2, progress);
        const currentGr3 = interpolateColor(startColors.gr3, toColors.gr3, progress);

        changeCSSVariable("background-color1", currentBg1);
        changeCSSVariable("background-color2", currentBg2);
        changeCSSVariable("ground-color1", currentGr1);
        changeCSSVariable("ground-color2", currentGr2);
        changeCSSVariable("ground-color3", currentGr3);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            ThemeSystem.transitionTarget = null;
        }
    };

    animate();
}

/**
 * Atualiza variante do tema baseada na pontuação
 * @param {number} score - Pontuação atual
 */
function updateThemeVariant(score) {
    const targetVariant = ThemeSystem.getVariantForScore(score);
    if (targetVariant !== ThemeSystem.currentVariant) {
        animateThemeTransition(ThemeSystem.currentVariant, targetVariant, 5000);
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

    scoreHundredSoundEffect = ThemeSystem.getCurrentThemeSound(["game", "scoreHundred"]);
    scoreThousandSoundEffect = ThemeSystem.getCurrentThemeSound(["game", "scoreThousand"]);
    currentThemeBackgroundMusic = ThemeSystem.getCurrentThemeSound(["game", "backgroundMusic"]);
    cactusSpawnSoundEffect = ThemeSystem.getCurrentThemeSound(["cactus", "cactusSpawn"]);
    cloudSpawnSoundEffect = ThemeSystem.getCurrentThemeSound(["sky", "cloud", "cloudSpawn"]);
    dinoJumpSoundEffect = ThemeSystem.getCurrentThemeSound(["dino", "dinoJump"]);
    dinoLandSoundEffect = ThemeSystem.getCurrentThemeSound(["dino", "dinoLand"]);
    dinoCrouchSoundEffect = ThemeSystem.getCurrentThemeSound(["dino", "dinoCrouch"]);
    dinoDeathSoundEffect = ThemeSystem.getCurrentThemeSound(["dino", "dinoDeath"]);
    dinoWalkSoundEffect = ThemeSystem.getCurrentThemeSound(["dino", "dinoWalk"]);

    playThemeBackgroundMusic();

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
    maxScoreAtGameStart = Session.max_score;
    dinoRotation = 0;
    dino.style.setProperty("--rotation", `${dinoRotation}deg`);
    stopCrouch();
    scheduleDinoFootsteps();

    if (gameOverRecord) {
        gameOverRecord.classList.add("transparent");
    }
    
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
    gameOverMsg.classList.add("transparent");
}

/**
 * Handlers de eventos do jogo
 */

/**
 * Handler de ação do jogador (pular ou iniciar jogo)
 * @param {boolean} spacePressed - Se foi acionado por teclado
 */
function handleAction(spacePressed) {
    if (isDatabaseLoading) return;

    if (gameStarted) {
        jump();
    } else {
        if (isGameOver) {
            restartGame();
        } else {
            startGame();
        }
    }
}

/**
 * Handler de fim de jogo
 */
function handleGameOver() {
    isGameOver = true;
    gameStarted = false;
    clearDinoFootsteps();
    
    let score = Session.score;
    Session.total_score += score;
    if (score !== 0) {
        gameOverMsgScoreShower.innerText = score.toString().padStart(5, '0');
    }
    if (gameOverPhrase) {
        gameOverPhrase.innerText = getRandomGameOverPhrase();
    }

    const quebrouRecorde = score > maxScoreAtGameStart;
    if (gameOverRecord) {
        gameOverRecord.classList.toggle("transparent", !quebrouRecorde);
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
    AudioService.playAudio(dinoDeathSoundEffect, sfxTrack);
    gameOverMsg.classList.remove('transparent');
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

    AudioService.playAudio(dinoJumpSoundEffect, sfxTrack);

    dino.style.setProperty("--rotation", `${dinoRotation}deg`);

    dino.classList.remove('jump');

    void dino.offsetWidth;

    if (jumpAnimationEndHandler) {
        dino.removeEventListener("animationend", jumpAnimationEndHandler);
    }

    jumpAnimationEndHandler = (event) => {
        if (event.animationName !== "pular") return;

        dino.removeEventListener("animationend", jumpAnimationEndHandler);
        jumpAnimationEndHandler = null;

        jumping = false;
        triggerGroundImpact();

        dino.classList.remove('jump');
        if (!gameStarted) return;

        dinoRotation += 180;
        dino.style.setProperty("--rotation", `${dinoRotation}deg`);

        if (dinoLandSoundEffect) {
            AudioService.playAudio(dinoLandSoundEffect, sfxTrack);
        }
    };

    dino.addEventListener("animationend", jumpAnimationEndHandler, { once: true });
    dino.classList.add('jump');
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
    const previousCactusAnimationDuration = cactusAnimationDuration;
                 
    // Atualiza a variante do tema baseada no score
    updateThemeVariant(Session.score);
    
    if (getBooleanConfig("scoreSounds") && Session.score % 100 === 0) {
        AudioService.playAudio(scoreHundredSoundEffect, scoTrack);
    }

    if (getBooleanConfig("scoreSounds") && Session.score % 1000 === 0) {
        AudioService.playAudio(scoreThousandSoundEffect, scoTrack);
    }
    
    if (Session.score > Session.max_score) {
        Session.max_score = Session.score;
    
        if (!maxScoreElement.classList.contains("max-score-gain")) {
            maxScoreElement.classList.add("max-score-gain");
        }
    } else {
        if (maxScoreElement.classList.contains("max-score-gain")) {
            maxScoreElement.classList.remove("max-score-gain");
            void maxScoreElement.offsetWidth;
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

    if (cactusAnimationDuration !== previousCactusAnimationDuration) {
        scheduleDinoFootsteps();
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
        
        const cactusMoveDuration = `${cactusAnimationDuration + (Math.random() * cactusAnimationDurationRandomness)}s`;
        changeCSSVariable("cactus-move-duration", cactusMoveDuration, cactus);

        // AudioService.playAudio("cactus", sfxTrack);
        AudioService.playAudio(cactusSpawnSoundEffect, sfxTrack);

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

        if (cloudSpawnSoundEffect) {
            AudioService.playAudio(cloudSpawnSoundEffect, sfxTrack);
        }

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
