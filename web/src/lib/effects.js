export const effectByRarity = {
    common: 'none',
    uncommon: 'ribbons',
    rare: 'waves',
    epic: 'contour',
    legendary: 'holo',
    especial: 'diamond',
}

export const effectName = (r) => r.effect || effectByRarity[r.rarity] || 'none'
export const effectClass = (r) => 'fx-' + effectName(r)