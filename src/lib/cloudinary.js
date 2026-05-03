// Real Cloudinary upload — uses unsigned upload preset via REST API
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'dualzone_preset'

const LIMITS = {
  image: 10 * 1024 * 1024,   // 10 MB
  audio: 20 * 1024 * 1024,   // 20 MB
  video: 100 * 1024 * 1024,  // 100 MB
  file: 100 * 1024 * 1024,   // 100 MB
}

/**
 * Upload a file to Cloudinary using unsigned upload preset
 * @param {File|Blob} file - File to upload
 * @param {string} type - 'image' | 'audio' | 'video' | 'file'
 * @param {string} folder - Cloudinary folder name
 * @returns {{ secure_url: string, public_id: string, bytes: number }}
 */
export const uploadToCloudinary = async (file, type = 'image', folder = 'messages') => {
  if (!CLOUD_NAME) throw new Error('Cloudinary cloud name not configured')

  const limit = LIMITS[type] || LIMITS.file
  if (file.size > limit) {
    throw new Error(`File too large. Max size for ${type}: ${limit / (1024 * 1024)}MB`)
  }

  // Determine resource_type for Cloudinary
  let resourceType = 'auto'
  if (type === 'image') resourceType = 'image'
  else if (type === 'video' || type === 'audio') resourceType = 'video' // Cloudinary treats audio as video resource_type
  else resourceType = 'auto'

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `dualzone/${folder}`)

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`

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

/**
 * Upload a Blob (e.g. from MediaRecorder) to Cloudinary
 * @param {Blob} blob - Audio/Video blob
 * @param {string} type - 'audio' | 'video'
 * @param {string} folder - Cloudinary folder name
 */
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

/**
 * Check Cloudinary storage usage (via admin API proxy or estimated from uploads)
 * NOTE: Cloudinary Admin API requires backend proxy. This is a client-side estimate.
 */
export const checkStorageUsage = async () => {
  // Cloudinary Admin API needs server-side auth (api_key + api_secret).
  // For client-side, we'll track upload sizes locally and show warnings.
  try {
    const totalBytes = parseInt(localStorage.getItem('dz_cloudinary_bytes') || '0')
    const limitBytes = 1 * 1024 * 1024 * 1024 // 1 GB free tier estimate
    const pct = Math.round((totalBytes / limitBytes) * 100)
    return { totalBytes, limitBytes, percentage: pct }
  } catch {
    return { totalBytes: 0, limitBytes: 1073741824, percentage: 0 }
  }
}

export const trackUploadSize = (bytes) => {
  const current = parseInt(localStorage.getItem('dz_cloudinary_bytes') || '0')
  localStorage.setItem('dz_cloudinary_bytes', String(current + bytes))
}
