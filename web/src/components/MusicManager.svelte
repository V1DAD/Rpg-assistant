<script>
    import { pb } from '../lib/pb.js'
    import { tracks, playlists, playback, dm } from '../lib/music.js'
    import { readAudioMeta } from '../lib/audioMeta.js'

    /* ---------- single track upload ---------- */
    let trackForm
    let name = '', audioFile = null, iconFile = null
    let coverPreview = null, coverFromTags = false
    let busy = false, error = ''

    /* ---------- manual playlist form ---------- */
    let plName = '', selected = []

    /* ---------- folder import ---------- */
    const AUDIO_EXT = /\.(mp3|ogg|oga|opus|flac|wav|m4a|aac|webm)$/i
    let folderPlName = ''
    let folderBusy = false
    let folderMsg = ''
    let folderErrors = []
    let folderDone = 0
    let folderTotal = 0
    let pendingIds = [], pendingName = ''

    function pbError(err) {
        const d = err?.response?.data
        const fields = d && Object.entries(d).map(([k, v]) => `${k}: ${v.message}`).join('; ')
        return fields || err?.response?.message || err?.message || String(err)
    }

    async function createPending() {
        try {
            await pb.collection('playlists').create({ name: pendingName, tracks: pendingIds })
            folderMsg = `Created "${pendingName}" with ${pendingIds.length} track(s)` +
                (folderErrors.length ? `, ${folderErrors.length} failed` : '')
            pendingIds = []
            folderPlName = ''
        } catch (err) {
            folderMsg = 'Tracks uploaded, but the playlist could not be created: ' + pbError(err)
        }
    }

    async function importFolder(e) {
        const files = [...e.target.files].filter((f) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name))
        e.target.value = ''                      // lets you pick the same folder again later
        if (!files.length) { folderMsg = 'No audio files found in that folder'; return }

        const listName = folderPlName.trim() || files[0].webkitRelativePath.split('/')[0] || 'New playlist'
        folderBusy = true
        folderErrors = []
        folderDone = 0
        folderTotal = files.length
        pendingIds = []

        try {
            // 1. read tags first, so the playlist can follow disc/track order
            const entries = []
            for (let i = 0; i < files.length; i++) {
                folderMsg = `Reading tags ${i + 1}/${files.length}`
                entries.push({ file: files[i], meta: await readAudioMeta(files[i]) })
            }
            entries.sort((a, b) =>
                (a.meta.disk ?? 1) - (b.meta.disk ?? 1) ||
                (a.meta.track ?? 1e6) - (b.meta.track ?? 1e6) ||
                a.file.webkitRelativePath.localeCompare(b.file.webkitRelativePath, undefined, { numeric: true })
            )

            // 2. upload one by one
            const ids = []
            for (const { file, meta } of entries) {
                folderMsg = `Uploading ${folderDone + 1}/${folderTotal}: ${file.name}`
                try {
                    const fd = new FormData()
                    const base = file.name.replace(/\.[^.]+$/, '')
                    fd.append('name', meta.title ? (meta.artist ? `${meta.artist} - ${meta.title}` : meta.title) : base)
                    fd.append('audio', file)
                    if (meta.cover) fd.append('icon', meta.cover)
                    const rec = await pb.collection('tracks').create(fd)
                    ids.push(rec.id)
                } catch {
                    folderErrors = [...folderErrors, file.name]
                }
                folderDone++
            }

            // 3. create the playlist
            if (ids.length) {
                pendingIds = ids
                pendingName = listName
                await createPending()
            } else {
                folderMsg = 'Nothing could be uploaded'
            }
        } catch (err) {
            folderMsg = 'Import failed: ' + pbError(err)
        } finally {
            folderBusy = false
        }
    }

    /* ---------- helpers and grouping ---------- */
    const iconUrl = (t) => (t.icon ? pb.files.getURL(t, t.icon) : null)

    // group tracks by playlist (keeps the playlist's own track order)
    $: trackById = new Map($tracks.map((t) => [t.id, t]))
    $: groups = $playlists
        .map((p) => ({
            playlist: p,
            tracks: (p.tracks ?? []).map((id) => trackById.get(id)).filter(Boolean),
        }))
        .filter((g) => g.tracks.length)
    $: inPlaylist = new Set($playlists.flatMap((p) => p.tracks ?? []))
    $: loose = $tracks.filter((t) => !inPlaylist.has(t.id))

    /* ---------- single track form ---------- */
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
            error = 'Upload failed: ' + pbError(e)
        } finally {
            busy = false
        }
    }

    async function removeTrack(t) {
        if (confirm(`Delete "${t.name}"?`)) await pb.collection('tracks').delete(t.id)
    }

    /* ---------- playlists ---------- */
    async function addPlaylist() {
        if (!plName || !selected.length) return
        try {
            await pb.collection('playlists').create({ name: plName, tracks: selected })
            plName = ''; selected = []
        } catch (e) {
            alert('Could not create the playlist: ' + pbError(e))
        }
    }

    async function removePlaylist(p) {
        if (confirm(`Delete playlist "${p.name}"?`)) await pb.collection('playlists').delete(p.id)
    }
</script>

<div class="manager pixelify-sans">
    <section class="panel">
        <h2>Tracks</h2>

        <div class="panel">
            <strong>Import a folder as a playlist</strong>
            <label>Playlist name (optional, defaults to the folder name)
                <input bind:value={folderPlName} disabled={folderBusy} />
            </label>
            <label>Folder
                <input type="file" webkitdirectory multiple disabled={folderBusy} on:change={importFolder} />
            </label>
            {#if folderBusy}
                <progress value={folderDone} max={folderTotal}></progress>
            {/if}
            {#if folderMsg}<p class="status">{folderMsg}</p>{/if}
            {#if pendingIds.length && !folderBusy}
                <button type="button" on:click={createPending}>Retry creating playlist</button>
            {/if}
            {#if folderErrors.length}<p class="err">Failed: {folderErrors.join(', ')}</p>{/if}
        </div>

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

        {#each groups as g (g.playlist.id)}
            <details class="group" open={$playback?.playlist === g.playlist.id}>
                <summary class="pixelify-sans">
                    <span class="grow">{g.playlist.name}</span>
                    <span class="count">{g.tracks.length}</span>
                </summary>
                {#each g.tracks as t (t.id)}
                    <div class="row" class:now={$playback?.track === t.id && $playback?.playing}>
                        <div class="thumb">{#if iconUrl(t)}<img src={iconUrl(t)} alt="" />{/if}</div>
                        <span class="grow">{t.name}</span>
                        <button on:click={() => dm.play(t.id, g.playlist.id)}>Play</button>
                        <button on:click={() => removeTrack(t)}>Delete</button>
                    </div>
                {/each}
            </details>
        {/each}

        {#if groups.length && loose.length}
            <div class="subhead">Not in a playlist</div>
        {/if}

        {#each loose as t (t.id)}
            <div class="row" class:now={$playback?.track === t.id && $playback?.playing}>
                <div class="thumb">{#if iconUrl(t)}<img src={iconUrl(t)} alt="" />{/if}</div>
                <span class="grow">{t.name}</span>
                <button on:click={() => dm.play(t.id)}>Play</button>
                <button on:click={() => removeTrack(t)}>Delete</button>
            </div>
        {/each}

        {#if !$tracks.length}
            <p class="empty">No tracks yet.</p>
        {/if}
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
    .status { margin: 0; text-align: center; font-size: 14px; }

    /* playlist dropdown groups */
    .group { border: 3px inset #999; background: #bbb; }
    .group > summary {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 6px; cursor: pointer;
        background: #999; list-style: none;
    }
    .group > summary::-webkit-details-marker { display: none; }
    .group > summary::before { content: '▸'; }
    .group[open] > summary::before { content: '▾'; }
    .group .row { border-width: 0 0 2px 0; }
    .count { opacity: 0.7; }
    .subhead { margin-top: 6px; font-size: 13px; opacity: 0.7; }
</style>