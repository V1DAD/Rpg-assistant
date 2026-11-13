import PocketBase from 'pocketbase'

export const pb = new PocketBase('/')   // same origin as the page
pb.autoCancellation(false)              // see note below