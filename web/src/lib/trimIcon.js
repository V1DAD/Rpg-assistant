export async function trimIcon(url) {
    const img = new Image()
    img.src = url
    await img.decode()

    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)

    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height)
    let minX = width, minY = height, maxX = -1, maxY = -1
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
                if (x < minX) minX = x
                if (x > maxX) maxX = x
                if (y < minY) minY = y
                if (y > maxY) maxY = y
            }
        }
    }
    if (maxX < 0) return null // fully transparent

    const w = maxX - minX + 1, h = maxY - minY + 1
    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    out.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, w, h)
    return out.toDataURL()
}