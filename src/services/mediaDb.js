// src/services/mediaDb.js

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

async function savePin() {
  formError.value = ''

  // 1) Basics prüfen
  var desc = String(description.value ?? '').trim()
  if (!desc) {
    formError.value = 'Bitte eine Beschreibung eingeben.'
    return
  }

  if (!pickedLatLng.value) {
    formError.value = 'Bitte erst auf die Karte klicken.'
    return
  }

  // 2) Medien Pflicht
  if (!selectedFiles.value || selectedFiles.value.length === 0) {
    formError.value = 'Bitte mindestens ein Foto oder Video hochladen.'
    return
  }

  // 3) Medien speichern (wenn das fehlschlägt -> kein Pin)
  var mediaRefs = []
  try {
    var i
    for (i = 0; i < selectedFiles.value.length; i = i + 1) {
      var file = selectedFiles.value[i]
      if (!file) continue

      var mediaId = await saveMedia(file) 
      // saveMedia soll eine id zurückgeben (string)

      var mime = String(file.type ?? '')
      var type = 'file'
      if (mime.startsWith('image/')) type = 'image'
      if (mime.startsWith('video/')) type = 'video'

      mediaRefs.push({
        id: String(mediaId),
        type: type,
        name: String(file.name ?? ''),
        mime: mime
      })
    }
  } catch (e) {
    formError.value = 'Upload fehlgeschlagen. Bitte erneut versuchen.'
    return
  }

  if (mediaRefs.length === 0) {
    formError.value = 'Upload fehlgeschlagen. Keine Dateien gespeichert.'
    return
  }

  // 4) Pin erstellen und speichern
  var pin = {
    id: crypto.randomUUID(),
    description: desc,
    date: date.value ? String(date.value) : '',
    lat: Number(pickedLatLng.value.lat),
    lng: Number(pickedLatLng.value.lng),
    media: mediaRefs
  }

  pinsStore.addPin(pin)

  // 5) UI reset
  selectedFiles.value = []
  description.value = ''
  date.value = ''
  pickedLatLng.value = null
  showForm.value = false
}

