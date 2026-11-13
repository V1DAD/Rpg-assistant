<script>
    import { onMount, onDestroy } from 'svelte'
    import { pb } from './lib/pb.js'
    import Login from './views/Login.svelte'
    import DMView from './views/DMView.svelte'
    import PlayerView from './views/PlayerView.svelte'
    import { initMusic, stopMusic } from './lib/music.js'
    import MusicBar from './components/MusicBar.svelte'

    let user = pb.authStore.isValid ? pb.authStore.record : null

    // keep `user` in sync with the auth store (login, logout, token refresh)
    const unsubscribe = pb.authStore.onChange(() => {
        user = pb.authStore.isValid ? pb.authStore.record : null
        if (!user) stopMusic()
    })

    $: if (user) initMusic()
    onDestroy(unsubscribe)

    // on page load, validate the saved session against the server
    // (handles expired tokens and role changes made by the DM)
    onMount(async () => {
        if (!pb.authStore.isValid) return
        try {
            await pb.collection('users').authRefresh()
        } catch {
            pb.authStore.clear()
        }
    })

    function logout() {
        pb.realtime.unsubscribe()   // drop all live subscriptions
        pb.authStore.clear()
    }
</script>

{#if user}
    <header class="topbar pixelify-sans">
        <span>{user.name || user.email} · {user.role}</span>
        <button on:click={logout} style="background-color:firebrick; border-color:#ff7777; color:white">Log out</button>
    </header>

    <main>
        <!-- {#key} remounts the view if a different user logs in, so no stale data -->
        {#key user.id}
            {#if user.role === 'dm'}
                <DMView {user} />
            {:else}
                <PlayerView {user} />
            {/if}
        {/key}
    </main>

    <MusicBar isDM={user.role === 'dm'} />
{:else}
    <Login />
{/if}
