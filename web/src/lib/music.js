import { writable, get } from 'svelte/store'
import { pb } from './pb.js'

/* ---------- helpers ---------- */
const isDM = () => pb.authStore.record?.role === 'dm'
const load = (k, fallback) => {
    try { const v = localStorage.getItem(k); return v === null ? fallback : Number(v) }
    catch { return fallback }
}
const save = (k, v) => { try { localStorage.setItem(k, String(v)) } catch {} }

/* ---------- server clock ---------- */
let offset = 0
export const serverNow = () => Date.now() + offset

async function syncClock() {
    let best = null
    for (let i = 0; i < 5; i++) {
        const t0 = Date.now()
        try {
            const res = await fetch('/api/time', { cache: 'no-store' })
            if (!res.ok) throw new Error('HTTP ' + res.status)
            const { now } = await res.json()
            if (typeof now !== 'number') throw new Error('bad response')
            const t1 = Date.now()
            const rtt = t1 - t0
            if (!best || rtt < best.rtt) best = { rtt, offset: now + rtt / 2 - t1 }
        } catch { /* try again */ }
    }
    if (best) offset = best.offset
    else console.warn('/api/time is not available: using the local clock (sync across devices will be less precise)')
}

/* ---------- stores ---------- */
export const tracks = writable([])
export const playlists = writable([])
export const playback = writable(null)        // the single shared record
export const localPaused = writable(false)    // this player's own pause (never saved)
export const blocked = writable(false)        // browser refused autoplay
export const time = writable(0)
export const duration = writable(0)
export const volume = writable(load('volume', 0.7))
export const musicError = writable('')

/* ---------- audio engine ---------- */
const audio = new Audio()
audio.preload = 'auto'

let started = false
let unsubs = []
let timer = 0

const expectedPos = (rec) => {
    const pos = Number(rec.position) || 0
    if (!rec.playing) return pos
    const t = pos + (serverNow() - (Number(rec.started_at) || 0)) / 1000
    return Number.isFinite(t) ? Math.max(0, t) : 0
}

export const currentPos = () => {
    const rec = get(playback)
    return rec ? expectedPos(rec) : 0
}

async function apply() {
    const rec = get(playback)
    const track = rec && get(tracks).find((t) => t.id === rec.track)
    if (!rec || !track?.audio) { audio.pause(); return }

    const url = pb.files.getURL(track, track.audio)
    if (audio.dataset.url !== url) {
        audio.dataset.url = url
        audio.src = url
    }
    if (audio.readyState < 1) return            // 'loadedmetadata' calls apply() again

    const pos = expectedPos(rec)
    try {
        if (Math.abs(audio.currentTime - pos) > 0.5) audio.currentTime = Math.max(0, pos)
    } catch (err) {
        console.warn('Could not seek:', err)
    }

    if (rec.playing && !get(localPaused)) {
        try { await audio.play(); blocked.set(false) }
        catch { blocked.set(true) }
    } else {
        audio.pause()
    }
}

// call from a click handler to get past the browser's autoplay block
export const enableSound = () => apply()

audio.addEventListener('loadedmetadata', () => { duration.set(audio.duration || 0); apply() })
audio.addEventListener('timeupdate', () => time.set(audio.currentTime))
audio.addEventListener('ended', () => { if (isDM()) dm.next(1, true) })

volume.subscribe((v) => { audio.volume = v; save('volume', v) })
localPaused.subscribe(() => { if (started) apply() })

/* ---------- lifecycle ---------- */
export async function initMusic() {
    if (started) return
    started = true
    try {
        await syncClock()

        const keepLive = async (col, store) => {
            store.set(await pb.collection(col).getFullList())
            unsubs.push(
                await pb.collection(col).subscribe('*', ({ action, record }) => {
                    store.update((list) =>
                        action === 'delete' ? list.filter((r) => r.id !== record.id)
                            : list.some((r) => r.id === record.id) ? list.map((r) => (r.id === record.id ? record : r))
                                : [...list, record])
                    apply()
                })
            )
        }

        await keepLive('tracks', tracks)
        await keepLive('playlists', playlists)

        let rec = (await pb.collection('playback').getFullList())[0] ?? null
        if (!rec && isDM()) {
            rec = await pb.collection('playback').create({ playing: false, position: 0, started_at: 0 })
        }
        playback.set(rec)
        unsubs.push(
            await pb.collection('playback').subscribe('*', ({ action, record }) => {
                playback.set(action === 'delete' ? null : record)
                apply()
            })
        )

        musicError.set(rec || isDM() ? '' : 'Waiting for the DM to start the music')
        apply()
        timer = setInterval(apply, 4000)
    } catch (err) {
        console.error('Music init failed:', err)
        musicError.set('Music setup failed: ' + (err?.message || err))
        stopMusic()            // clean up so a page reload starts fresh
    }
}

export function stopMusic() {
    started = false
    clearInterval(timer)
    unsubs.forEach((u) => { try { u() } catch {} })
    unsubs = []
    audio.pause()
    audio.removeAttribute('src')
    delete audio.dataset.url
    audio.load()
    tracks.set([]); playlists.set([]); playback.set(null)
    time.set(0); duration.set(0)
}

/* ---------- DM controls ---------- */
async function write(data) {
    try {
        let rec = get(playback)
        if (!rec) {
            rec = (await pb.collection('playback').getFullList())[0]
                ?? await pb.collection('playback').create({ playing: false, position: 0, started_at: 0 })
            playback.set(rec)
        }
        const updated = await pb.collection('playback').update(rec.id, data)
        playback.set(updated)
        musicError.set('')
        apply()
    } catch (err) {
        console.error('Playback update failed:', err)
        musicError.set('Could not update playback: ' + (err?.message || err))
    }
}

export const dm = {
    play: (track, playlist = null) =>
        write({ track, playlist: playlist ?? '', playing: true, position: 0, started_at: serverNow() }),

    pause: () => write({ playing: false, position: currentPos(), started_at: serverNow() }),
    resume: () => write({ playing: true, started_at: serverNow() }),
    seek: (sec) => write({ position: sec, started_at: serverNow() }),

    next(dir = 1, fromEnded = false) {
        const rec = get(playback)
        const pl = rec && get(playlists).find((p) => p.id === rec.playlist)
        const ids = pl?.tracks ?? []
        const i = ids.indexOf(rec?.track)
        if (!pl || i === -1 || !ids.length) {
            // single track finished: stop at the start
            return fromEnded
                ? write({ playing: false, position: 0, started_at: serverNow() })
                : Promise.resolve()
        }
        return dm.play(ids[(i + dir + ids.length) % ids.length], pl.id)
    },
}