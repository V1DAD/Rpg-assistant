<script>
    import { onDestroy } from 'svelte'
    import { pb } from '../lib/pb.js'
    import { liveList } from '../lib/liveList.js'

    export let user

    const notes = liveList('notes')

    let selectedId = null
    let loadedId = null          // the note whose text is currently in the editor
    let title = '', body = '', shared = false
    let dirty = false
    let status = ''
    let timer = 0

    $: sorted = [...$notes].sort((a, b) => (b.created || '').localeCompare(a.created || ''))
    $: mine = sorted.filter((n) => n.owner === user.id)
    $: others = sorted.filter((n) => n.owner !== user.id)
    $: current = $notes.find((n) => n.id === selectedId)
    $: editable = !!current && current.owner === user.id

    // load the editor only when a different note is selected, so updates
    // coming back from the server never overwrite what is being typed
    $: if (current && current.id !== loadedId) {
        loadedId = current.id
        title = current.title ?? ''
        body = current.body ?? ''
        shared = !!current.shared
        dirty = false
        status = ''
    }
    $: if (!current) loadedId = null

    function changed() {
        dirty = true
        status = 'Unsaved...'
        clearTimeout(timer)
        timer = setTimeout(save, 700)
    }

    async function save() {
        clearTimeout(timer)
        if (!dirty || !loadedId || !editable) return
        const id = loadedId
        const data = { title, body }
        if (user.role === 'dm') data.shared = shared
        dirty = false
        try {
            await pb.collection('notes').update(id, data)
            status = 'Saved'
        } catch (err) {
            dirty = true
            status = 'Could not save'
            console.error('Saving the note failed:', err)
        }
    }

    async function select(id) {
        if (id === selectedId) return
        await save()                 // never lose pending text when switching notes
        selectedId = id
    }

    async function create() {
        await save()
        try {
            const rec = await pb.collection('notes').create({ owner: user.id, title: 'New note', body: '' })
            selectedId = rec.id
        } catch (err) {
            alert('Could not create the note: ' + (err?.message || err))
        }
    }

    async function remove() {
        if (!current || !editable) return
        if (!confirm(`Delete "${current.title || 'Untitled'}"?`)) return
        const id = current.id
        dirty = false
        selectedId = null
        try {
            await pb.collection('notes').delete(id)
        } catch (err) {
            alert('Could not delete the note: ' + (err?.message || err))
        }
    }

    onDestroy(() => { clearTimeout(timer); save() })   // save when leaving the tab
</script>

<div class="notes pixelify-sans">
    <aside class="panel list">
        <button on:click={create}>+ New note</button>

        {#each mine as n (n.id)}
            <button class="item" class:sel={n.id === selectedId} on:click={() => select(n.id)}>
                <span class="grow">{n.title || 'Untitled'}</span>
                {#if n.shared}<span class="tag">shared</span>{/if}
            </button>
        {/each}

        {#if others.length}
            <div class="subhead">Shared by the DM</div>
            {#each others as n (n.id)}
                <button class="item" class:sel={n.id === selectedId} on:click={() => select(n.id)}>
                    <span class="grow">{n.title || 'Untitled'}</span>
                </button>
            {/each}
        {/if}

        {#if !mine.length && !others.length}
            <p class="empty">No notes yet.</p>
        {/if}
    </aside>

    <section class="panel editor">
        {#if !current}
            <p class="empty">Select a note or create a new one.</p>
        {:else if editable}
            <input class="ttl" placeholder="Title" bind:value={title} on:input={changed} />
            <textarea placeholder="Write here..." bind:value={body} on:input={changed}></textarea>
            <div class="foot">
                <span class="status">{status}</span>
                {#if user.role === 'dm'}
                    <label class="check">
                        <input type="checkbox" bind:checked={shared} on:change={changed} />
                        Share with players
                    </label>
                {/if}
                <button on:click={remove}>Delete</button>
            </div>
        {:else}
            <h2>{current.title || 'Untitled'}</h2>
            <div class="readonly">{current.body}</div>
        {/if}
    </section>
</div>

<style>
    .notes { display: flex; gap: 16px; align-items: flex-start; max-width: 1000px; margin: 0 auto; flex-wrap: wrap; }
    .list { width: 260px; flex: none; }
    .editor { flex: 1; min-width: 300px; }
    .item { display: flex; align-items: center; gap: 6px; text-align: left; }
    .item.sel { background: #d9d9a0; border-style: inset; }
    .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag { font-size: 11px; padding: 0 4px; border: 2px outset #999; background: #bbb; }
    .subhead { margin-top: 6px; font-size: 13px; opacity: 0.7; }
    .ttl { font-size: 18px; }
    textarea { min-height: 380px; resize: vertical; line-height: 1.3; }
    .foot { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
    .status { font-size: 13px; opacity: 0.7; }
    .check { flex-direction: row; align-items: center; gap: 6px; }
    .readonly { white-space: pre-wrap; background: #bbb; border: 3px inset #999; padding: 8px; min-height: 200px; }
    .editor :global(h2) { margin: 0; }
</style>
