const clamp = (v) => Math.min(1, Math.max(0, v))

export function holo(node) {
    let frame = 0
    let last = null

    const apply = () => {
        frame = 0
        if (!last) return
        // the box center stays put while the card tilts; use the untilted size
        const r = node.getBoundingClientRect()
        const px = clamp((last.clientX - (r.left + r.width / 2)) / node.offsetWidth + 0.5)
        const py = clamp((last.clientY - (r.top + r.height / 2)) / node.offsetHeight + 0.5)
        node.style.setProperty('--px', px.toFixed(3))
        node.style.setProperty('--py', py.toFixed(3))
        node.style.setProperty('--rx', ((0.5 - py) * 14).toFixed(2) + 'deg')
        node.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg')
    }

    const move = (e) => {
        last = e
        if (!frame) frame = requestAnimationFrame(apply)
    }
    const enter = () => node.classList.add('tracking')
    const leave = () => {
        cancelAnimationFrame(frame)
        frame = 0
        last = null
        node.classList.remove('tracking')
        for (const p of ['--px', '--py', '--rx', '--ry']) node.style.removeProperty(p)
    }

    node.addEventListener('pointerenter', enter)
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerleave', leave)

    return {
        destroy() {
            cancelAnimationFrame(frame)
            node.removeEventListener('pointerenter', enter)
            node.removeEventListener('pointermove', move)
            node.removeEventListener('pointerleave', leave)
        },
    }
}