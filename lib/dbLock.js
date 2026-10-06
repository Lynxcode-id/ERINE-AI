import { Mutex } from 'async-mutex'
export const dbSwapLock = new Mutex()
