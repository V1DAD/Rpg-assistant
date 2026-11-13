<script>
    import { pb } from '../lib/pb.js'
    import { trimIcon } from '../lib/trimIcon.js'
    import { fitText } from '../lib/fitText.js'
    import { holo } from '../lib/holo.js'
    import { effectClass, effectName } from '../lib/effects.js'
    import FxLayer from './FxLayer.svelte'
    import { fitStats } from '../lib/fitStats.js'

    export let record
    export let canAdjust = false   // owner or DM: shows the +/- fields
    export let isDM = false        // DM: can edit base stats

    let iconSrc = null
    let latest = 0
    let editingBase = false
    let baseDraft = {}
    let error = ''
    let classBroken = false
    let lastClass
    $: if (record.class !== lastClass) {
        lastClass = record.class
        classBroken = false
    }
    $: loadIcon(record)
    $: base = record.base_stats ?? {}
    $: stats =
        record.current_stats && Object.keys(record.current_stats).length
            ? record.current_stats
            : base

    async function loadIcon(r) {
        const id = ++latest
        const src = r.icon ? await trimIcon(pb.files.getURL(r, r.icon)) : null
        if (id === latest) iconSrc = src
    }

    // "3" adds 3, "-3" subtracts 3
    async function adjust(key, e) {
        const n = Number(e.target.value)
        if (!Number.isFinite(n) || n === 0) return
        error = ''
        try {
            await pb.collection('characters').update(record.id, {
                current_stats: { ...stats, [key]: (stats[key] ?? 0) + n },
            })
            e.target.value = ''
        } catch (err) {
            error = 'Could not update'
        }
    }

    function startEditBase() {
        baseDraft = { ...base }
        editingBase = true
    }

    async function saveBase() {
        error = ''
        const clean = {}
        for (const [k, v] of Object.entries(baseDraft)) clean[k] = Number(v) || 0
        try {
            await pb.collection('characters').update(record.id, { base_stats: clean })
            editingBase = false
        } catch (err) {
            error = 'Could not save base stats'
        }
    }
</script>

<div class="card-body character {record.rarity ?? ''} {effectClass(record)}" use:holo style="width:480px; height:640px; ">
    <FxLayer effect={effectName(record)} />
    <div class="card-title">
        <div class="pixelify-sans card-name"
             use:fitText={{ max: 16, text: record.name }}>
            {record.name}
        </div>
        {#if record.class}
            {#if classBroken}
                <span class="pixelify-sans class-text">{record.class}</span>
            {:else}
                <img src="/classes/{record.class}.png"
                     alt={record.class}
                     style="object-fit:contain;"
                     on:error={() => (classBroken = true)}>
            {/if}
        {/if}
    </div>

    <div class="card-row">
        <div class="card-field icon-field dark">
            {#if iconSrc}
                <img src={iconSrc} alt={record.name} style="object-fit:contain;">
            {/if}
        </div>

        <div class="card-field stats-field" use:fitStats={JSON.stringify(stats) + editingBase}>
            {#if editingBase}
                {#each Object.keys(baseDraft) as key}
                    <label class="stat pixelify-sans">
                        {key.toUpperCase()}:
                        <input class="num" type="number" bind:value={baseDraft[key]} />
                    </label>
                {/each}
            {:else}
                {#each Object.entries(stats) as [key, value]}
                    <div class="stat pixelify-sans">
            <span class="label">
              {key.toUpperCase()}: {value}
                {#if base[key] !== undefined && base[key] !== value}
                <small>/{base[key]}</small>
              {/if}
            </span>
                        {#if canAdjust}
                            <input
                                    class="delta"
                                    type="text"
                                    inputmode="numeric"
                                    placeholder="±"
                                    on:keydown={(e) => e.key === 'Enter' && adjust(key, e)}
                            />
                        {/if}
                    </div>
                {/each}
            {/if}
        </div>
    </div>

    <div class="card-field desc-field">
        <div class="pixelify-sans card-text"
             use:fitText={{ max: 16, text: record.description }}>
            {record.description}
        </div>
    </div>

    {#if isDM}
        <div class="dm-bar pixelify-sans">
            {#if editingBase}
                <button on:click={saveBase}>Save base</button>
                <button on:click={() => (editingBase = false)}>Cancel</button>
            {:else}
                <button on:click={startEditBase}>Edit base</button>
            {/if}
        </div>
    {/if}
    {#if error}<div class="err pixelify-sans">{error}</div>{/if}
</div>

<style>
    /* top row: icon on the left, stats on the right */
    .card-row {
        display: flex;
        flex-direction: row;
        gap: 5px;
        width: 95%;
        height: 40%;
        margin: 5px 0;
        align-self: center;
    }
    .card-row .card-field {
        margin: 0;
        width: auto;
        height: 100%;
        min-height: 0;
    }
    .icon-field  { flex: 1; align-items: center; justify-content: center; }
    .stats-field {
        flex: 1.4;
        display: flex;
        flex-direction: column;
        padding: 3px 5px;
        overflow: hidden;
    }

    /* each row takes an equal share of the box; the font size is set by fitStats on the box */
    .stat {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: row;      /* overrides the global label rule */
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        margin: 0;
        line-height: 1.1;
        overflow: hidden;
    }
    .stat .label {
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
    }
    .stat small { opacity: 0.6; font-size: 0.6em; }

    .delta, .num {
        align-self: stretch;
        width: 2.4em;
        margin: 1px 0;
        padding: 0;
        box-sizing: border-box;
        font: inherit;
        font-size: 0.65em;
        text-align: center;
        border: 2px inset #999;
        background: #ddd;
    }

    /* description fills whatever height is left */
    .desc-field { height: auto; flex: 1; min-height: 0; }

    .dm-bar { display: flex; gap: 4px; justify-content: center; margin-top: 2px; }
    .dm-bar button { font: inherit; font-size: 11px; }
    .err { color: #a00; font-size: 11px; text-align: center; }
</style>