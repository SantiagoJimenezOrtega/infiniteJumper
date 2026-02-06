export class Input {
    constructor() {
        this.keys = {
            ArrowLeft: { pressed: false, justReleased: false, startTime: 0, duration: 0 },
            ArrowRight: { pressed: false, justReleased: false, startTime: 0, duration: 0 },
            ArrowUp: { pressed: false, justReleased: false, startTime: 0, duration: 0 },
            ArrowDown: { pressed: false, justReleased: false, startTime: 0, duration: 0 }
        };
        this.activeTouches = new Map();

        window.addEventListener("keydown", e => this.onKeyDown(e));
        window.addEventListener("keyup", e => this.onKeyUp(e));
        this.setupTouch();
    }

    setupTouch() {
        const getZone = (x) => {
            const width = window.innerWidth;
            if (x < width * 0.35) return "ArrowLeft";
            if (x > width * 0.65) return "ArrowRight";
            return "ArrowUp";
        };

        window.addEventListener("touchstart", e => {
            if (e.target.tagName === "BUTTON") return;
            e.preventDefault();
            const touch = e.changedTouches[0];
            const zone = getZone(touch.clientX);

            // Release other zones to prevent multi-jump confusion
            ["ArrowLeft", "ArrowRight", "ArrowUp"].forEach(z => {
                if (z !== zone) this.handleRelease(z);
            });

            this.handlePress(zone);
            this.activeTouches.set(touch.identifier, { key: zone, startY: touch.clientY, startX: touch.clientX });
        }, { passive: false });

        window.addEventListener("touchmove", e => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const data = this.activeTouches.get(touch.identifier);

                // Cancel jump on swipe down
                if (data && touch.clientY - data.startY > 50) {
                    this.handlePress("ArrowDown");
                    if (data.key) {
                        this.handleRelease(data.key);
                        data.key = null;
                    }
                }
            }
        }, { passive: false });

        window.addEventListener("touchend", e => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const data = this.activeTouches.get(touch.identifier);
                if (data && data.key) this.handleRelease(data.key);
                this.handleRelease("ArrowDown");
                this.activeTouches.delete(touch.identifier);
            }
        }, { passive: false });

        window.addEventListener("touchcancel", e => {
            e.preventDefault();
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].forEach(k => this.handleRelease(k));
            this.activeTouches.clear();
        });
    }

    handlePress(key) {
        if (this.keys[key] && !this.keys[key].pressed) {
            this.keys[key].pressed = true;
            this.keys[key].startTime = performance.now();
        }
    }

    handleRelease(key) {
        if (this.keys[key] && this.keys[key].pressed) {
            this.keys[key].pressed = false;
            this.keys[key].justReleased = true;
            this.keys[key].duration = performance.now() - this.keys[key].startTime;
        }
    }

    onKeyDown(e) {
        const code = e.code;
        if (this.keys[code]) this.handlePress(code);
    }

    onKeyUp(e) {
        const code = e.code;
        if (this.keys[code]) this.handleRelease(code);
    }

    update() {
        // Reset justReleased flags for next frame
        Object.values(this.keys).forEach(k => k.justReleased = false);
    }

    get isCharging() {
        return this.keys.ArrowLeft.pressed || this.keys.ArrowRight.pressed || this.keys.ArrowUp.pressed;
    }

    getCharge(key) {
        if (this.keys[key].pressed) {
            return performance.now() - this.keys[key].startTime;
        }
        return 0;
    }
}
