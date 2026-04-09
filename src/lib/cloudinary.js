const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'dualzone_preset'

const LIMITS = {
  image: 10 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  file: 100 * 1024 * 1024,
}

export const uploadToCloudinary = async (file, type = 'image', folder = 'messages') => {
  if (!CLOUD_NAME || CLOUD_NAME === 'your_cloud_name') {
    throw new Error('Cloudinary environment variables (VITE_CLOUDINARY_CLOUD_NAME) are missing. Please add them to your Render dashboard or local .env file.')
  }

  const limit = LIMITS[type] || LIMITS.file
  if (file.size > limit) {
    throw new Error(`File too large. Max size for ${type}: ${limit / (1024 * 1024)}MB`)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `dualzone/${folder}`)

  const resourceType = type === 'file' ? 'raw' : 'auto'

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Upload failed')
  }

  return res.json()
}

export const getFileType = (file) => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return 'file'
}
