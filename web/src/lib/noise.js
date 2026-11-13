export function applyNoise({ size = 64, scale = 3, minAlpha = 6, maxAlpha = 22 } = {}) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    const img = ctx.createImageData(size, size)

    for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() < 0.5 ? 0 : 255          // black or white specks
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        img.data[i + 3] = minAlpha + Math.random() * (maxAlpha - minAlpha)
    }
    ctx.putImageData(img, 0, 0)

    const root = document.documentElement.style
    root.setProperty('--noise', `url(${c.toDataURL()})`)
    root.setProperty('--noise-size', `${size * scale}px`)
}