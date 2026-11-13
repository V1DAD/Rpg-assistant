<script>
    import { pb } from '../lib/pb.js'
    import { tracks, playlists, playback, dm } from '../lib/music.js'
    import { readAudioMeta } from '../lib/audioMeta.js'

    let trackForm
    let name = '', audioFile = null, iconFile = null
    let coverPreview = null, coverFromTags = false
    let busy = false, error = ''

    let plName = '', selected = []

    const iconUrl = (t) => (t.icon ? pb.files.getURL(t, t.icon) : null)

    function setIcon(file, fromTags) {
        if (coverPreview) URL.revokeObjectURL(coverPreview)
        iconFile = file
        coverFromTags = fromTags
        coverPreview = file ? URL.createObjectURL(file) : null
    }

    async function onAudio(e) {
        audioFile = e.target.files[0]
        if (!audioFile) return

        const m = await readAudioMeta(audioFile)
        const fallback = audioFile.name.replace(/\.[^.]+$/, '')
        name = m.title ? (m.artist ? `${m.artist} - ${m.title}` : m.title) : fallback
        setIcon(m.cover, true)       // null if the file has no embedded cover
    }

    function onIcon(e) {
        setIcon(e.target.files[0] ?? null, false)   // a manual choice overrides the embedded cover
    }

    async function addTrack() {
        if (!audioFile) return
        busy = true; error = ''
        try {
            const fd = new FormData()
            fd.append('name', name || audioFile.name)
            fd.append('audio', audioFile)
            if (iconFile) fd.append('icon', iconFile)
            await pb.collection('tracks').create(fd)
            trackForm.reset()
            name = ''; audioFile = null
            setIcon(null, false)
        } catch (e) {
            error = 'Upload failed (check the file size limit)'
        } finally {
            busy = false
        }
    }

    async function removeTrack(t) {
        if (confirm(`Delete "${t.name}"?`)) await pb.collection('tracks').delete(t.id)
    }

    async function addPlaylist() {
        if (!plName || !selected.length) return
        await pb.collection('playlists').create({ name: plName, tracks: selected })
        plName = ''; selected = []
    }

    async function removePlaylist(p) {
        if (confirm(`Delete playlist "${p.name}"?`)) await pb.collection('playlists').delete(p.id)
    }
</script>

<div class="manager pixelify-sans">
    <section class="panel">
        <h2>Tracks</h2>

        <form class="panel" bind:this={trackForm} on:submit|preventDefault={addTrack}>
            <label>Audio file
                <input type="file" accept="audio/*" required on:change={onAudio} />
            </label>
            <label>Name <input bind:value={name} /></label>
            <label>Icon {coverFromTags ? '(from the file, choose another to replace)' : '(optional)'}
                <input type="file" accept="image/*" on:change={onIcon} />
            </label>
            {#if coverPreview}
                <div class="cover-preview"><img src={coverPreview} alt="" /></div>
            {/if}
            <button disabled={busy}>{busy ? 'Uploading...' : 'Add track'}</button>
            {#if error}<p class="err">{error}</p>{/if}
        </form>

        {#each $tracks as t (t.id)}
            <div class="row" class:now={$playback?.track === t.id && $playback?.playing}>
                <div class="thumb">{#if iconUrl(t)}<img src={iconUrl(t)} alt="" />{/if}</div>
                <span class="grow">{t.name}</span>
                <button on:click={() => dm.play(t.id)}>Play</button>
                <button on:click={() => removeTrack(t)}>Delete</button>
            </div>
        {:else}
            <p class="empty">No tracks yet.</p>
        {/each}
    </section>

    <section class="panel">
        <h2>Playlists</h2>

        <form class="panel" on:submit|preventDefault={addPlaylist}>
            <label>Name <input bind:value={plName} required /></label>
            <div class="picker">
                {#each $tracks as t (t.id)}
                    <label class="check">
                        <input type="checkbox" value={t.id} bind:group={selected} /> {t.name}
                    </label>
                {/each}
            </div>
            <button disabled={!plName || !selected.length}>Create playlist</button>
        </form>

        {#each $playlists as p (p.id)}
            <div class="row" class:now={$playback?.playlist === p.id && $playback?.playing}>
                <span class="grow">{p.name} ({p.tracks.length})</span>
                <button disabled={!p.tracks.length} on:click={() => dm.play(p.tracks[0], p.id)}>Play</button>
                <button on:click={() => removePlaylist(p)}>Delete</button>
            </div>
        {:else}
            <p class="empty">No playlists yet.</p>
        {/each}
    </section>
</div>

<style>
    .manager { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-items: flex-start; }
    .manager > .panel { width: 380px; }
    .row { display: flex; align-items: center; gap: 8px; padding: 4px; border: 2px inset #999; background: #bbb; }
    .row.now { background: #d9d9a0; }
    .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .thumb { width: 32px; height: 32px; background: #777; border: 2px inset #999; box-sizing: border-box; flex: none; }
    .thumb img { width: 100%; height: 100%; object-fit: scale-down; image-rendering: pixelated; }
    .picker { max-height: 140px; overflow: auto; background: #bbb; border: 3px inset #999; padding: 4px; }
    .check { flex-direction: row; align-items: center; gap: 6px; }
    .manager :global(h2) { margin: 0; }
    .cover-preview {
        width: 96px; height: 96px;
        background: #777; border: 3px inset #999; box-sizing: border-box;
    }
    .cover-preview img {
        width: 100%; height: 100%;
        object-fit: scale-down; image-rendering: pixelated;
    }
</style>