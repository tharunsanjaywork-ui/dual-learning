import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const LIMITS = {
  image: 10 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  file: 100 * 1024 * 1024,
}

// Keeping the function name the same so we don't have to refactor imports across the app
export const uploadToCloudinary = async (file, type = 'image', folder = 'messages') => {
  const limit = LIMITS[type] || LIMITS.file
  if (file.size > limit) {
    throw new Error(`File too large. Max size for ${type}: ${limit / (1024 * 1024)}MB`)
  }

  const fileExtension = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`
  const fileRef = ref(storage, `dualzone/${folder}/${fileName}`)

  await uploadBytes(fileRef, file)
  const downloadUrl = await getDownloadURL(fileRef)

  return { secure_url: downloadUrl }
}

export const getFileType = (file) => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return 'file'
}
