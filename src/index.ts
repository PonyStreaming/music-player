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
       const s = document.getElementById('nowplaying')!;
       scrollText(s, e.track.artist + ' — ' + e.track.title);
   }
});

// this is incredibly awful. it is, however, also handily cancellable. so it has that going for it.
let timeout: ReturnType<typeof setTimeout>;
function scrollText(s: HTMLElement, text: string) {
    clearTimeout(timeout);
    const p = s.parentElement!;
    p.style.transitionProperty = '';
    p.style.transitionDuration = '0';
    p.style.left = '0';
    timeout = setTimeout(() => {
        s.innerText = text;
        timeout = setTimeout(() => {
            p.style.transitionProperty = 'left';
            timeout = setTimeout(() => {
                const width = s.offsetWidth;
                if (width + 30 > window.innerWidth) {
                    s.innerHTML = s.innerHTML + "<span style='width: 200px;display: inline-block;'></span>" + s.innerHTML;
                    document.body.className = 'scrolling';
                    timeout = setTimeout(() => {
                        p.style.transitionDuration = (width / 150) + 's';
                        p.style.left = (-width - 200) + "px";
                        timeout = setTimeout(() => {
                            p.style.transitionProperty = '';
                            p.style.transitionDuration = '0';
                            p.style.left = '0';
                            scrollText(s, text);
                        }, (width/150) * 1000 + 200);
                    }, 3000);
                } else {
                    document.body.className = '';
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
            clearTimeout(timeout);
            player.becomeInactive();
        }
    };
}

// for debugging purposes.
(window as any).player = player;
