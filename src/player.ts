const API_ROOT = "http://localhost:8080/api"

export interface Track {
    trackId: string;
    trackUrl: string;
    title: string;
    artist: string;
}

export class TrackUpdatedEvent extends Event {
    public readonly track?: Track;

    constructor(eventInit: EventInit & {track?: Track}) {
        super("trackupdated", eventInit);
        this.track = eventInit.track;
    }
}

export class Player extends EventTarget {
    private events: EventSource;
    private autoplay = false;
    private playing = false;
    private currentTrack?: Track;
    private audio = new Audio();

    constructor(private readonly stream: string, private readonly password: string) {
        super();
        this.events = new EventSource(`${API_ROOT}/events?channels=events-${this.stream}&password=${this.password}`);
        this.events.onmessage = (e) => this.handleMessage(e);
        this.audio.addEventListener('ended', () => this.playNextTrack());
        this.updateState();
    }

    public addEventListener(type: 'trackupdated', listener: (e: TrackUpdatedEvent) => void, options?: boolean | AddEventListenerOptions): void {
        super.addEventListener(type, listener, options);
    }

    private emitUpdatedTrack() {
        this.dispatchEvent(new TrackUpdatedEvent({track: this.currentTrack}))
    }

    private async fetch(url: string, init: RequestInit = {}): Promise<any> {
        if (url.indexOf('?') !== -1) {
            url += '&password=' + this.password;
        }  else {
            url += '?password=' + this.password;
        }
        return fetch(url, init);
    }

    private async updateState() {
        const result = await this.fetch(`${API_ROOT}/streams/${this.stream}/state`);
        const json = await result.json();
        if (json.status === "ok") {
            this.autoplay = json.state.autoplay != "false";
            this.playing = json.state.playing == "true";
            this.currentTrack = json.state.currentTrack;
            this.emitUpdatedTrack();
            await this.reconcileState();
        }
    }

    private async reconcileState() {
        const playing = !this.audio.paused;
        if (!playing && this.playing && this.currentTrack) {
            await this.play()
        }
        if (!this.playing && playing) {
            this.stop();
        }
    }

    private async play() {
        if (!this.currentTrack) {
            await this.playNextTrack();
            return;
        }
        console.log(`playing: ${this.currentTrack.trackUrl}`);
        this.audio.src = this.currentTrack.trackUrl;
        try {
            await this.audio.play();
        } catch(e) {
            if (e.name === "NotAllowedError") {
                console.log("ughhhh");
                return;
            }
            await this.playNextTrack();
        }
    }

    private stop() {
        this.audio.pause();
        this.fetch(`${API_ROOT}/streams/${this.stream}/state`, {method: "PATCH", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: `playing=false`});
    }

    private async playNextTrack(delay: number = 0) {
        const request = await this.fetch(`${API_ROOT}/streams/${this.stream}/next`);
        const json = await request.json();
        this.currentTrack = json.track;
        this.emitUpdatedTrack();
        const result = await this.fetch(`${API_ROOT}/streams/${this.stream}/state`, {method: "PATCH", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: `currentTrack=${this.currentTrack?.trackId || ''}&playing=true`});
        if (delay) {
            await sleep(delay);
        }
        await this.play();
    }

    private async handleMessage(e: MessageEvent) {
        const data = JSON.parse(e.data);
        if (data.stream !== this.stream) {
            console.warn("Got data for the wrong stream?");
            return;
        }
        if (data.event === "update") {
            const k: String = data.event.key;
            const value: String = data.event.value;
            switch (k) {
                case "currentTrack":
                    // we don't need to do anything here? I think only we can trigger this.
                    break;
                case "playing":
                    this.playing = value === "true";
                    await this.reconcileState();
                    break;
                case "autoplay":
                    this.autoplay = value !== "false";
                    break;
            }
        } else if (data.event === "requestSkip") {
            console.log("Skipping track...");
            await this.fadeTrack();
            await this.playNextTrack();
        }
    }

    public async becomeActive(delay: number = 0) {
        if (!this.autoplay) {
            return;
        }
        await this.playNextTrack(delay);
    }

    public becomeInactive() {
        this.stop();
    }

    private fadeTrack(): Promise<void> {
        if (this.audio.paused) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                this.audio.volume -= 0.0165;
                if (this.audio.volume < 0.0165) {
                    clearInterval(interval);
                    setTimeout(() => {
                        this.audio.pause();
                        this.audio.volume = 1;
                        resolve();
                    }, 1000);
                }
            }, 33)
        });
    }
}

function sleep(milliseconds: number): Promise<void> {
    if (milliseconds == 0) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        setTimeout(() => resolve(), milliseconds);
    })
}