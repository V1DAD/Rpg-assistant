import { readable } from 'svelte/store'
import { pb } from './pb.js'

export function liveList(collection, options = {}) {
    return readable([], (set) => {
        let list = []
        let unsubscribe = null
        let stopped = false

        // initial load
        pb.collection(collection)
            .getFullList(options)
            .then((records) => {
                if (stopped) return
                list = records
                set(list)
            })
            .catch((err) => console.error(`liveList(${collection}) load failed`, err))

        // realtime updates
        pb.collection(collection)
            .subscribe('*', ({ action, record }) => {
                if (action === 'delete') {
                    list = list.filter((r) => r.id !== record.id)
                } else if (list.some((r) => r.id === record.id)) {
                    list = list.map((r) => (r.id === record.id ? record : r))
                } else {
                    list = [...list, record]
                }
                set(list)
            }, options)
            .then((unsub) => {
                if (stopped) unsub()      // component was destroyed before the subscription finished
                else unsubscribe = unsub
            })
            .catch((err) => console.error(`liveList(${collection}) subscribe failed`, err))

        // runs when the last component stops using the store
        return () => {
            stopped = true
            unsubscribe?.()
        }
    })
}