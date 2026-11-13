<script>
    import { pb } from '../lib/pb.js'

    let email = ''
    let password = ''
    let error = ''
    let busy = false

    async function login() {
        error = ''
        busy = true
        try {
            await pb.collection('users').authWithPassword(email, password)
            // App.svelte reacts to the auth store change by itself
        } catch {
            error = 'Wrong email or password'
        } finally {
            busy = false
        }
    }
</script>

<form class="login pixelify-sans" on:submit|preventDefault={login}>
    <h2>RPG Assistant</h2>
    <input type="email" placeholder="Email" bind:value={email} required />
    <input type="password" placeholder="Password" bind:value={password} required />
    <button disabled={busy}>{busy ? '...' : 'Log in'}</button>
    {#if error}<p class="err">{error}</p>{/if}
</form>

<style>
    .login {
        display: flex; flex-direction: column; gap: 8px;
        width: 260px; margin: 15vh auto 0; padding: 20px;
        border: 3px outset #999; box-shadow: 5px 5px 0 #000;
    }
    h2 { margin: 0 0 6px; text-align: center; }
    input, button { font: inherit; padding: 6px; }
    .err { color: #a00; margin: 0; text-align: center; }
</style>