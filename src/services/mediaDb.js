var DB_NAME = 'memorymap_db'
var DB_VERSION = 1
var STORE_NAME = 'media'

function openDb() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = function (event) {
      var db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = function (event) {
      resolve(event.target.result)
    }

    request.onerror = function () {
      reject(request.error)
    }
  })
}

export function saveMediaFile(file) {
  return new Promise(function (resolve, reject) {
    openDb().then(function (db) {
      var tx = db.transaction(STORE_NAME, 'readwrite')
      var store = tx.objectStore(STORE_NAME)

      var id = crypto.randomUUID()

      var record = {
        id: id,
        blob: file,                  // File ist auch ein Blob
        name: file.name,
        mime: file.type,
        size: file.size,
        createdAt: Date.now()
      }

      var req = store.put(record)

      req.onsuccess = function () {
        resolve({
          id: id,
          name: record.name,
          mime: record.mime,
          size: record.size
        })
      }

      req.onerror = function () {
        reject(req.error)
      }

      tx.oncomplete = function () {
        db.close()
      }
    }).catch(function (e) {
      reject(e)
    })
  })
}

export function getMediaBlob(id) {
  return new Promise(function (resolve, reject) {
    openDb().then(function (db) {
      var tx = db.transaction(STORE_NAME, 'readonly')
      var store = tx.objectStore(STORE_NAME)

      var req = store.get(id)

      req.onsuccess = function () {
        var rec = req.result
        resolve(rec ? rec.blob : null)
      }

      req.onerror = function () {
        reject(req.error)
      }

      tx.oncomplete = function () {
        db.close()
      }
    }).catch(function (e) {
      reject(e)
    })
  })
}

export function deleteMedia(id) {
  return new Promise(function (resolve, reject) {
    openDb().then(function (db) {
      var tx = db.transaction(STORE_NAME, 'readwrite')
      var store = tx.objectStore(STORE_NAME)

      var req = store.delete(id)

      req.onsuccess = function () {
        resolve()
      }

      req.onerror = function () {
        reject(req.error)
      }

      tx.oncomplete = function () {
        db.close()
      }
    }).catch(function (e) {
      reject(e)
    })
  })
}


