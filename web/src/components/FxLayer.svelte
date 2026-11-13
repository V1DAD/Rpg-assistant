<script context="module">
    let counter = 0
</script>

<script>
    export let effect = 'none'
    const id = 'fx' + counter++      // unique pattern ids per card
</script>

{#if effect === 'waves'}
    <svg class="fx-svg" aria-hidden="true">
        <defs>
            <pattern id="{id}-a" width="200" height="160" patternUnits="userSpaceOnUse"
                     patternTransform="rotate(-35)">
                <g class="hi-stroke" stroke-linejoin="round">
                    <path stroke-width="46" stroke-opacity=".16"
                          d="M-200 80 Q-150 30 -100 80 T0 80 T100 80 T200 80 T300 80 T400 80"/>
                    <path stroke-width="32" stroke-opacity=".22"
                          d="M-200 80 Q-150 30 -100 80 T0 80 T100 80 T200 80 T300 80 T400 80"/>
                    <path stroke-width="18" stroke-opacity=".30"
                          d="M-200 80 Q-150 30 -100 80 T0 80 T100 80 T200 80 T300 80 T400 80"/>
                </g>
            </pattern>
            <pattern id="{id}-b" width="200" height="160" patternUnits="userSpaceOnUse"
                     patternTransform="rotate(-35) translate(0 80)">
                <g class="lo-stroke" stroke-linejoin="round">
                    <path stroke-width="46" stroke-opacity=".16"
                          d="M-200 80 Q-150 30 -100 80 T0 80 T100 80 T200 80 T300 80 T400 80"/>
                    <path stroke-width="32" stroke-opacity=".22"
                          d="M-200 80 Q-150 30 -100 80 T0 80 T100 80 T200 80 T300 80 T400 80"/>
                    <path stroke-width="18" stroke-opacity=".30"
                          d="M-200 80 Q-150 30 -100 80 T0 80 T100 80 T200 80 T300 80 T400 80"/>
                </g>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#{id}-a)" />
        <rect width="100%" height="100%" fill="url(#{id}-b)" />
    </svg>
{:else if effect === 'ribbons'}
    <svg class="fx-svg" aria-hidden="true">
        <defs>
            <pattern id="{id}-a" width="80" height="40" patternUnits="userSpaceOnUse">
                <path class="hi-fill" d="M0 10 Q20 0 40 10 T80 10 V20 Q60 30 40 20 T0 20 Z"/>
            </pattern>
            <pattern id="{id}-b" width="80" height="40" patternUnits="userSpaceOnUse"
                     patternTransform="translate(0 20)">
                <path class="lo-fill" d="M0 10 Q20 0 40 10 T80 10 V20 Q60 30 40 20 T0 20 Z"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#{id}-a)" opacity=".3" />
        <rect width="100%" height="100%" fill="url(#{id}-b)" opacity=".3" />
    </svg>
{/if}

<style>
    .fx-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        pointer-events: none;
    }
    .hi-stroke { fill: none; stroke: var(--hi); }
    .lo-stroke { fill: none; stroke: var(--lo); }
    .hi-fill   { fill: var(--hi); }
    .lo-fill   { fill: var(--lo); }
</style>