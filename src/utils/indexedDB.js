
/*! ESLINT IMPORT END !*/

const DB_NAME = 'IG_HELPER';
const DB_VERSION = 1;
const STORE_NAME = 'DATA_CACHE';

/**
 * openDB
 */
export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(`Database open failed: ${event.target.error}`);
    });
}

/**
 * @param {Object} data
 */
export async function addData(data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(`Insert failed: ${event.target.error}`);
    });
}

/**
 * @param {number} id
 */
export async function getData(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(`Read failed: ${event.target.error}`);
    });
}

/**
 * @returns {Promise<Array>}
 */
export async function getAllData() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(`Read all failed: ${event.target.error}`);
    });
}

/**
 * @param {Object} data
 */
export async function updateData(data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(`Update failed: ${event.target.error}`);
    });
}

/**
 * @param {number} id
 */
export async function deleteData(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject(`Delete failed: ${event.target.error}`);
    });
}