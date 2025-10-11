(function (global) {
    const SFX_PATHS = {
        coin: "assets/sound/coin.wav",
        jump: "assets/sound/jump.wav",
        win: "assets/sound/win.wav",
        lose: "assets/sound/lose.wav"
    };

    const MUSIC_PATHS = [
        "assets/sound/MesmerizingGalaxyLoop.mp3",
        "assets/sound/GalacticRap.mp3"
    ];

    const DEFAULT_VOLUMES = {
        coin: 0.7,
        jump: 0.6,
        win: 0.8,
        lose: 0.75,
        background: 0.25
    };

    const soundTemplates = {};
    const musicTracks = [];
    let musicTrack = null;
    let unlocked = false;
    let sfxVolumeMultiplier = 1;
    let musicVolumeSetting = clampVolume(DEFAULT_VOLUMES.background ?? 0.5);

    function clampVolume(value) {
        return Math.max(0, Math.min(1, value));
    }

    function createTemplate(name, url) {
        const audio = new Audio(url);
        audio.preload = "auto";
        const baseVolume = clampVolume(DEFAULT_VOLUMES[name] ?? 1);
        audio._baseVolume = baseVolume;
        audio.volume = baseVolume;
        audio.load();
        return audio;
    }

    function ensureSfxTemplates() {
        Object.entries(SFX_PATHS).forEach(([name, url]) => {
            if (!soundTemplates[name]) {
                soundTemplates[name] = createTemplate(name, url);
            }
        });
    }

    function ensureMusicTracks() {
        if (!musicTracks.length) {
            MUSIC_PATHS.forEach(path => {
                const track = new Audio(path);
                track.preload = "auto";
                track.loop = true;
                track._baseVolume = clampVolume(DEFAULT_VOLUMES.background ?? 0.5);
                track.volume = musicVolumeSetting;
                track.load();
                track._sourcePath = path;
                musicTracks.push(track);
            });
        }
        return musicTracks;
    }

    function pickRandomMusicTrack() {
        const tracks = ensureMusicTracks();
        if (!tracks.length) return null;
        return tracks[Math.floor(Math.random() * tracks.length)];
    }

    function unlockAudio() {
        if (unlocked) return;
        unlocked = true;

        const audios = [...Object.values(soundTemplates)];
        const tracks = ensureMusicTracks();
        if (tracks.length) {
            audios.push(...tracks);
        }

        audios.forEach(audio => {
            audio.muted = true;
            audio.currentTime = 0;
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.muted = false;
            }).catch(() => {
                audio.muted = false;
            });
        });
    }

    function playSound(name) {
        ensureSfxTemplates();
        const template = soundTemplates[name];
        if (!template) return;

        const instance = template.cloneNode();
        const baseVolume = template._baseVolume !== undefined ? template._baseVolume : (template.volume ?? 1);
        instance.volume = clampVolume(baseVolume * sfxVolumeMultiplier);
        instance.currentTime = 0;
        instance.play().catch(() => {
            // Ignore play errors (e.g., autoplay restrictions)
        });
    }

    function setSfxVolume(volume) {
        sfxVolumeMultiplier = clampVolume(volume);
        Object.values(soundTemplates).forEach(template => {
            if (!template) return;
            const baseVolume = template._baseVolume !== undefined ? template._baseVolume : (template.volume ?? 1);
            template.volume = clampVolume(baseVolume * sfxVolumeMultiplier);
        });
    }

    function startBackground(options = {}) {
        ensureMusicTracks();
        unlockAudio();
        const nextTrack = pickRandomMusicTrack();
        if (!nextTrack) return;

        if (musicTrack && musicTrack !== nextTrack) {
            musicTrack.pause();
            musicTrack.currentTime = 0;
        }

        musicTrack = nextTrack;

        if (typeof options.volume === "number") {
            musicVolumeSetting = clampVolume(options.volume);
        }
        musicTrack.volume = musicVolumeSetting;
        if (options.loop !== undefined) {
            musicTrack.loop = !!options.loop;
        }
        if (typeof options.startTime === "number") {
            musicTrack.currentTime = Math.max(0, options.startTime);
        } else {
            musicTrack.currentTime = 0;
        }

        musicTrack.play().catch(() => {
            // ignored
        });
    }

    function stopBackground(reset = true) {
        if (!musicTrack) return;
        musicTrack.pause();
        if (reset) {
            musicTrack.currentTime = 0;
        }
    }

    function pauseBackground() {
        if (!musicTrack) return;
        musicTrack.pause();
    }

    function resumeBackground() {
        if (!musicTrack) return;
        musicTrack.play().catch(() => {
            // ignored
        });
    }

    function init() {
        ensureSfxTemplates();
        ensureMusicTracks();
        unlockAudio();
    }

    document.addEventListener("pointerdown", () => {
        ensureSfxTemplates();
        ensureMusicTracks();
        unlockAudio();
    }, { once: true });

    ensureSfxTemplates();
    ensureMusicTracks();

    global.audioManager = {
        init,
        playCoin: () => playSound("coin"),
        playJump: () => playSound("jump"),
        playWin: () => playSound("win"),
        playLose: () => playSound("lose"),
        startBackground,
        stopBackground,
        pauseBackground,
        resumeBackground,
        setBackgroundVolume: volume => {
            const clampedVolume = clampVolume(volume);
            musicVolumeSetting = clampedVolume;
            const tracks = ensureMusicTracks();
            tracks.forEach(track => {
                track.volume = clampedVolume;
            });
            if (musicTrack) {
                musicTrack.volume = clampedVolume;
            }
        },
        setSfxVolume
    };
})(window);
