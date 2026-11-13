export function fitText(node, opts = {}) {
    let { min = 6, max = 18 } = opts

    function fit() {
        let lo = min, hi = max
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2)
            node.style.fontSize = mid + 'px'
            const fits = node.scrollHeight <= node.clientHeight &&
                node.scrollWidth <= node.clientWidth
            if (fits) lo = mid
            else hi = mid - 1
        }
        node.style.fontSize = lo + 'px'
    }

    fit()
    document.fonts?.ready.then(fit)   // refit once the font has loaded

    return {
        update(o = {}) {
            ;({ min = 6, max = 18 } = o)
            fit()
        },
    }
}