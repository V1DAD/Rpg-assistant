export function fitStats(node, _deps) {
    const MIN = 8
    const MAX = 48
    let raf = 0

    function fits() {
        for (const el of node.querySelectorAll('.stat, .label')) {
            if (el.scrollWidth > el.clientWidth + 1) return false
            if (el.scrollHeight > el.clientHeight + 1) return false
        }
        return true
    }

    function fit() {
        let lo = MIN, hi = MAX
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2)
            node.style.fontSize = mid + 'px'
            if (fits()) lo = mid
            else hi = mid - 1
        }
        node.style.fontSize = lo + 'px'
    }

    // wait one frame so the DOM has finished updating before measuring
    function schedule() {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(fit)
    }

    schedule()
    document.fonts?.ready.then(schedule)

    const ro = new ResizeObserver(schedule)   // refit if the card size changes
    ro.observe(node)

    return {
        update: schedule,
        destroy() {
            cancelAnimationFrame(raf)
            ro.disconnect()
        },
    }
}