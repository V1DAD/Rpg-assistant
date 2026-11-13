<script>
    import { pb } from '../lib/pb.js'
    import {
        playback, tracks, localPaused, blocked, time, duration, volume, dm, enableSound, musicError,
    } from '../lib/music.js'

    export let isDM = false

    let seeking = false
    let seekVal = 0

    $: track = $playback && $tracks.find((t) => t.id === $playback.track)
    $: iconUrl = track?.icon ? pb.files.getURL(track, track.icon) : null
    $: playing = !!$playback?.playing

    const fmt = (s) => {
        s = Math.max(0, Math.floor(s || 0))
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
    }
</script>

<footer class="musicbar pixelify-sans">
    <div class="mb-icon">
        {#if iconUrl}<img src={iconUrl} alt="" />{:else}<span>♪</span>{/if}
    </div>

    <div class="mb-main">
        <div class="mb-title">{track ? track.name : 'Nothing playing'}</div>
        {#if $musicError}<div class="mb-err">{$musicError}</div>{/if}
        <div class="mb-seek">
            <span>{fmt($time)}</span>
            {#if isDM}
                <input
                        type="range" min="0" max={$duration || 0} step="0.5"
                        value={seeking ? seekVal : $time}
                        disabled={!track}
                        on:input={(e) => { seeking = true; seekVal = +e.target.value }}
                        on:change={async (e) => { await dm.seek(+e.target.value); seeking = false }}
                />
            {:else}
                <progress value={$time} max={$duration || 1}></progress>
            {/if}
            <span>{fmt($duration)}</span>
        </div>
    </div>

    <div class="mb-controls">
        {#if isDM}
            <button on:click={() => dm.next(-1)} disabled={!track} title="Previous">|&lt;</button>
            <button on:click={() => (playing ? dm.pause() : dm.resume())} disabled={!track}>
                {playing ? '||' : '>'}
            </button>
            <button on:click={() => dm.next(1)} disabled={!track} title="Next">&gt;|</button>
        {:else}
            <button on:click={() => ($localPaused = !$localPaused)} disabled={!track}>
                {$localPaused ? 'Resume' : 'Pause'}
            </button>
        {/if}

        <label class="mb-vol">
            Vol
            <input type="range" min="0" max="1" step="0.01" bind:value={$volume} />
        </label>

        {#if $blocked && playing && !$localPaused}
            <button on:click={enableSound}>Enable sound</button>
        {/if}
    </div>
</footer>

<style>
    .musicbar {
        position: fixed;
        left: 0; right: 0; bottom: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 14px;
        background: #888888;
        color: #000;
        border-top: 3px outset #999999;
        box-shadow: 0 -4px 0 0 #000;
    }
    .mb-icon {
        width: 56px; height: 56px; flex: none;
        display: flex; align-items: center; justify-content: center;
        background: #777777;
        border: 3px inset #999999;
        box-sizing: border-box;
        overflow: hidden;
        font-size: 24px;
    }
    .mb-icon img {
        max-width: 100%; max-height: 100%;
        object-fit: scale-down;
        image-rendering: pixelated;
    }
    .mb-main { flex: 1; min-width: 0; }
    .mb-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mb-seek { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .mb-seek input, .mb-seek progress { flex: 1; min-width: 0; }
    .mb-controls { display: flex; align-items: center; gap: 8px; flex: none; }
    .mb-vol { flex-direction: row; align-items: center; gap: 6px; }
    .mb-vol input { width: 90px; }
    .mb-err { color: #a00000; font-size: 12px; }
</style>