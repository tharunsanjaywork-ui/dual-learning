// Dual Cloudinary upload — primary + secondary (backup) accounts
import { primaryDb } from './firebase'
import { doc, getDoc, setDoc, increment } from 'firebase/firestore'

const PRIMARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRIMARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'dualzone_preset'

const SECONDARY_CLOUD = import.meta.env.VITE_CLOUDINARY2_CLOUD_NAME
const SECONDARY_PRESET = import.meta.env.VITE_CLOUDINARY2_UPLOAD_PRESET || 'dualzone_backup_preset'

// Track which Cloudinary account is active
let useSecondaryCloud = localStorage.getItem('dz_use_secondary_cloud') === 'true'

export function switchCloudinaryToSecondary() {
  useSecondaryCloud = true
  localStorage.setItem('dz_use_secondary_cloud', 'true')
  console.warn('[DualZone] Switched to secondary Cloudinary (dgyhfnblt)')
}

export function switchCloudinaryToPrimary() {
  useSecondaryCloud = false
  localStorage.setItem('dz_use_secondary_cloud', 'false')
  console.info('[DualZone] Using primary Cloudinary (dbukfzcda)')
}

export function getActiveCloudName() {
  return useSecondaryCloud ? SECONDARY_CLOUD : PRIMARY_CLOUD
}

export function getActivePreset() {
  return useSecondaryCloud ? SECONDARY_PRESET : PRIMARY_PRESET
}

const LIMITS = {
  image: 10 * 1024 * 1024,   // 10 MB
  audio: 20 * 1024 * 1024,   // 20 MB
  video: 100 * 1024 * 1024,  // 100 MB
  file: 100 * 1024 * 1024,   // 100 MB
}

// ═══ FIRESTORE TRACKING ═══
export async function trackUploadSizeFirestore(bytes, accountId = 'primary') {
  try {
    const field = accountId === 'primary' ? 'primaryBytes' : 'secondaryBytes'
    await setDoc(
      doc(primaryDb, 'system', 'cloudinaryStats'),
      { [field]: increment(bytes) },
      { merge: true }
    )
    // Also update localStorage as cache
    const key = `dz_cloud_${accountId}_bytes`
    const current = parseInt(localStorage.getItem(key) || '0')
    localStorage.setItem(key, String(current + bytes))
  } catch (err) {
    console.warn('Failed to track upload size:', err)
  }
}

export async function checkStorageUsage() {
  try {
    const snap = await getDoc(doc(primaryDb, 'system', 'cloudinaryStats'))

    const primaryBytes = snap.exists() ? (snap.data().primaryBytes || 0) : 0
    const secondaryBytes = snap.exists() ? (snap.data().secondaryBytes || 0) : 0

    const LIMIT = 25 * 1024 * 1024 * 1024 // 25GB
    const primaryPct = Math.round((primaryBytes / LIMIT) * 100)
    const secondaryPct = Math.round((secondaryBytes / LIMIT) * 100)

    return {
      primary: {
        usedBytes: primaryBytes,
        usedGB: (primaryBytes / (1024 ** 3)).toFixed(2),
        totalGB: 25,
        percentage: Math.min(primaryPct, 100),
      },
      secondary: {
        usedBytes: secondaryBytes,
        usedGB: (secondaryBytes / (1024 ** 3)).toFixed(2),
        totalGB: 25,
        percentage: Math.min(secondaryPct, 100),
      }
    }
  } catch {
    const primaryBytes = parseInt(localStorage.getItem('dz_cloud_primary_bytes') || '0')
    return {
      primary: { usedBytes: primaryBytes, usedGB: (primaryBytes / (1024 ** 3)).toFixed(2), totalGB: 25, percentage: 0 },
      secondary: { usedBytes: 0, usedGB: '0.00', totalGB: 25, percentage: 0 }
    }
  }
}

/**
 * Upload a file to Cloudinary. Tries active account first.
 * If upload fails (quota), auto-switches to secondary.
 */
export const uploadToCloudinary = async (file, type = 'image', folder = 'messages') => {
  const limit = LIMITS[type] || LIMITS.file
  if (file.size > limit) {
    throw new Error(`File too large. Max size for ${type}: ${limit / (1024 * 1024)}MB`)
  }

  let resourceType = 'auto'
  if (type === 'image') resourceType = 'image'
  else if (type === 'video' || type === 'audio') resourceType = 'video'
  else resourceType = 'auto'

  try {
    const result = await doUpload(file, getActiveCloudName(), getActivePreset(), resourceType, folder)
    const acct = useSecondaryCloud ? 'secondary' : 'primary'
    trackUploadSizeFirestore(result.bytes, acct)
    return result
  } catch (err) {
    // If primary failed and we're not already on secondary, try secondary
    if (!useSecondaryCloud && SECONDARY_CLOUD) {
      console.warn('[DualZone] Primary Cloudinary upload failed, trying secondary...', err.message)
      switchCloudinaryToSecondary()
      const result = await doUpload(file, SECONDARY_CLOUD, SECONDARY_PRESET, resourceType, folder)
      trackUploadSizeFirestore(result.bytes, 'secondary')
      return result
    }
    throw err
  }
}

async function doUpload(file, cloudName, preset, resourceType, folder) {
  if (!cloudName) throw new Error('Cloudinary cloud name not configured')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', preset)
  formData.append('folder', `dualzone/${folder}`)

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData?.error?.message || `Upload failed with status ${response.status}`)
  }

  const data = await response.json()
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    bytes: data.bytes,
    format: data.format,
    resource_type: data.resource_type,
  }
}

export const uploadBlobToCloudinary = async (blob, type = 'audio', folder = 'messages') => {
  const ext = type === 'audio' ? 'webm' : 'webm'
  const file = new File([blob], `recording_${Date.now()}.${ext}`, { type: blob.type })
  return uploadToCloudinary(file, type, folder)
}

export const getFileType = (file) => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return 'file'
}

// Legacy localStorage tracking (kept for backward compatibility)
export const trackUploadSize = (bytes) => {
  const current = parseInt(localStorage.getItem('dz_cloudinary_bytes') || '0')
  localStorage.setItem('dz_cloudinary_bytes', String(current + bytes))
}
