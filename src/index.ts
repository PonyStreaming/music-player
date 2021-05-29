import {Player} from "./player";
import './index.css';

const params = new URLSearchParams(location.search);
const player = new Player(params.get("stream") || "", params.get("password") || "");
let currentTitle = "";
let currentArtist = "";
player.addEventListener('trackupdated', (e) => {
   if (e.track && (e.track.title !== currentTitle || e.track.artist !== currentArtist)) {
       currentArtist = e.track.artist;
       currentTitle = e.track.title;
       pending = [];
       const t = document.getElementById('nowplaying-title')!;
       scrollText(t, 'title', currentTitle);
       // t.innerText = currentTitle;
       const a = document.getElementById('nowplaying-artist')!;
       // a.innerText = currentArtist;
       scrollText(a, 'artist', currentArtist);
   }
});

// this is incredibly awful. it is, however, also handily cancellable. so it has that going for it.
let timeouts: {[id: string]: ReturnType<typeof setTimeout>} = {};
let pending: [HTMLElement, string, string][] = [];
function scrollText(s: HTMLElement, id: string, text: string) {
    clearTimeout(timeouts[id]);
    const p = s.parentElement!;
    p.style.transitionProperty = '';
    p.style.transitionDuration = '0';
    p.style.left = '0';
    timeouts[id] = setTimeout(() => {
        s.innerText = text;
        timeouts[id] = setTimeout(() => {
            p.style.transitionProperty = 'left';
            timeouts[id] = setTimeout(() => {
                const width = s.offsetWidth;
                if (width + 10 > window.innerWidth) {
                    s.innerHTML = s.innerHTML + "<span style='width: 200px;display: inline-block;'></span>" + s.innerHTML;
                    document.getElementById(id)!.classList.add('scrolling');
                    timeouts[id] = setTimeout(() => {
                        p.style.transitionDuration = ((width + 200) / 200) + 's';
                        p.style.left = (-width - 200) + "px";
                        timeouts[id] = setTimeout(() => {
                            p.style.transitionProperty = '';
                            p.style.transitionDuration = '0';
                            p.style.left = '0';
                            pending.push([s, id, text])
                            if (pending.length == 2) {
                                let p: [HTMLElement, string, string] | undefined;
                                while (p = pending.pop()) {
                                    scrollText(...p);
                                }
                            }
                        }, (width/150) * 1000 + 200);
                    }, 3000);
                } else {
                    pending.push([s, id, text])
                    if (pending.length == 2) {
                        let p: [HTMLElement, string, string] | undefined;
                        while (p = pending.pop()) {
                            scrollText(...p);
                        }
                    }
                    document.getElementById(id)!.classList.remove('scrolling');
                }
            }, 20);
        }, 20);
    }, 20);
}


declare global {
    interface Window {
        obsstudio?: {
            onActiveChange: (active: boolean) => void
        }
    }
}

if (window.obsstudio) {
    window.obsstudio.onActiveChange = (active) => {
        if (active) {
            player.becomeActive(3000);
        } else {
            pending = [];
            for (let i of Object.keys(timeouts)) {
                clearTimeout(timeouts[i]);
            }
            player.becomeInactive();
        }
    };
}

// for debugging purposes.
(window as any).player = player;
