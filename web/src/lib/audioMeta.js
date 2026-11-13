import { parseBlob } from 'music-metadata'

// Returns { title, artist, cover, track, disk } where cover is a File (or null)
export async function readAudioMeta(file) {
    try {
        const meta = await parseBlob(file, { duration: false, skipPostHeaders: true })
        const { title, artist, picture, track, disk } = meta.common

        let cover = null
        const pic = picture?.[0]
        if (pic) {
            const ext = (pic.format.split('/')[1] || 'img').replace('jpeg', 'jpg')
            cover = new File([pic.data], `cover.${ext}`, { type: pic.format })
        }
        return {
            title: title || '',
            artist: artist || '',
            cover,
            track: track?.no ?? null,
            disk: disk?.no ?? null,
        }
    } catch {
        return { title: '', artist: '', cover: null, track: null, disk: null }
    }
}