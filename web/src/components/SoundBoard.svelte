<script>
    import { pb } from '../lib/pb.js'
    import { tracks, playlists, dm, sfxActive } from '../lib/music.js'

    $: byId = new Map($tracks.map((t) => [t.id, t]))
    $: boards = $playlists
        .filter((p) => p.sfx)
        .map((p) => ({
            playlist: p,
            tracks: (p.tracks ?? []).map((id) => byId.get(id)).filter(Boolean),
        }))
        .filter((b) => b.tracks.length)

    const iconUrl = (t) => (t.icon ? pb.files.getURL(t, t.icon) : null)
</script>

<div class="board pixelify-sans">
    <div class="bar">
        <button on:click={() => dm.stopSfx()}>Stop all effects</button>
    </div>

    {#each boards as b (b.playlist.id)}
        <section class="panel">
            <h2>{b.playlist.name}</h2>
            <div class="pads">
                {#each b.tracks as t (t.id)}
                    <button class="pad" class:on={$sfxActive.has(t.id)} title={t.name} on:click={() => dm.sfx(t.id)}>
                        <span class="pad-icon">
                            {#if iconUrl(t)}<img src={iconUrl(t)} alt="" />{:else}♪{/if}
                        </span>
                        <span class="pad-name">{t.name}</span>
                    </button>
                {/each}
            </div>
        </section>
    {:else}
        <p class="empty">
            No sound effects yet. In the Music tab, import a folder or create a playlist
            and tick "Sound effects"; its tracks will appear here as buttons.
        </p>
    {/each}
</div>

<style>
    .board { display: flex; flex-direction: column; gap: 14px; max-width: 900px; margin: 0 auto; }
    .bar { display: flex; justify-content: flex-end; }
    .panel :global(h2) { margin: 0; }
    .pads { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
    .pad {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 6px; height: 110px; padding: 6px;
        box-shadow: 3px 3px 0 0 #000;
    }
    .pad:active { box-shadow: none; transform: translate(3px, 3px); }
    .pad.on { background: #d9d9a0; }
    .pad-icon {
        width: 48px; height: 48px; flex: none;
        display: flex; align-items: center; justify-content: center;
        background: #777; border: 3px inset #999; box-sizing: border-box;
        overflow: hidden; font-size: 22px;
    }
    .pad-icon img { max-width: 100%; max-height: 100%; object-fit: scale-down; image-rendering: pixelated; }
    .pad-name {
        width: 100%; text-align: center; font-size: 13px; line-height: 1.1;
        display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .empty { text-align: center; opacity: 0.7; }
</style>
