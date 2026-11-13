<script>
    import { liveList } from '../lib/liveList.js'
    import Card from '../components/Card.svelte'
    import CharacterCard from '../components/CharacterCard.svelte'
    import MusicManager from '../components/MusicManager.svelte'

    export let user

    const items = liveList('items')
    const characters = liveList('characters')

    let tab = 'items'
</script>

<nav class="tabs pixelify-sans">
    <button class:active={tab === 'items'} on:click={() => (tab = 'items')}>Items</button>
    <button class:active={tab === 'characters'} on:click={() => (tab = 'characters')}>Characters</button>
    <button class:active={tab === 'music'} on:click={() => (tab = 'music')}>Music</button>
</nav>

{#if tab === 'music'}
    <MusicManager />
{:else}
    <div class="grid">
        {#if tab === 'items'}
            {#each $items as item (item.id)}<Card record={item} />{/each}
        {:else}
            {#each $characters as c (c.id)}<CharacterCard record={c} canAdjust={true} isDM={true} />{/each}
        {/if}
    </div>
{/if}