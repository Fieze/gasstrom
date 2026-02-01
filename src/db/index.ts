
import Dexie, { type EntityTable } from 'dexie';
import type { Reading } from '../types';

export const db = new Dexie('GasStromDatabase') as Dexie & {
    readings: EntityTable<
        Reading,
        'id' // primary key "id" (for the typings only)
    >;
};

// Schema declaration:
db.version(1).stores({
    readings: 'id, type, date' // Primary key and indexed props
});
