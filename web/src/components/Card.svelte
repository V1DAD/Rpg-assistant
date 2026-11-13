<script>

    import { pb } from '../lib/pb.js'
    import { trimIcon } from '../lib/trimIcon.js'
    import { fitText } from '../lib/fitText.js'
    import { holo } from '../lib/holo.js'
    import { effectClass, effectName } from '../lib/effects.js'
    import FxLayer from './FxLayer.svelte'

    export let record

    let iconSrc = null
    let latest = 0

    $: loadIcon(record)

    async function loadIcon(r) {
        const id = ++latest
        const src = r.icon ? await trimIcon(pb.files.getURL(r, r.icon)) : null
        if (id === latest) iconSrc = src      // ignore stale results if the record changed meanwhile
    }
</script>

<div class="card-body {record.rarity} {effectClass(record)}" use:holo>
    <FxLayer effect={effectName(record)} />
    <div class="card-title">
        <div class="pixelify-sans card-name"
             use:fitText={{ max: 16, text: record.name }}>
            {record.name}
        </div>
        {#if record.class}
            <img src="/classes/{record.class}.png" alt={record.class} style="object-fit:contain;">
        {/if}
    </div>

    <div class="card-field dark">
        {#if iconSrc}
            <img src={iconSrc} alt="" style="object-fit:contain;">
        {/if}
    </div>

    <div class="card-field">
        <div class="pixelify-sans card-text"
             use:fitText={{ max: 18, text: record.description }}>
            {record.description}
        </div>
    </div>
</div>
