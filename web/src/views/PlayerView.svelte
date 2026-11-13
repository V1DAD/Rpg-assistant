<script>
    import { liveList } from '../lib/liveList.js'
    import Card from '../components/Card.svelte'
    import CharacterCard from '../components/CharacterCard.svelte'

    export let user

    // the API rules already filter these to this player's own records
    const items = liveList('items')
    const characters = liveList('characters')

    let tab = 'sheet'
</script>

<nav class="tabs pixelify-sans">
    <button class:active={tab === 'sheet'} on:click={() => (tab = 'sheet')}>My sheet</button>
    <button class:active={tab === 'items'} on:click={() => (tab = 'items')}>My items</button>
</nav>

<div class="grid">
    {#if tab === 'sheet'}
        {#each $characters as c (c.id)}
            <CharacterCard record={c} canAdjust={true} />
        {:else}
            <p class="empty">No character is assigned to your account yet.</p>
        {/each}
    {:else}
        {#each $items as item (item.id)}
            <Card record={item} />
        {:else}
            <p class="empty">You have no items yet.</p>
        {/each}
    {/if}
</div>
