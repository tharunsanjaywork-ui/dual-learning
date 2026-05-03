export const searchGifs = async (query, limit = 8, offset = 0) => {
  const API_KEY = import.meta.env.VITE_GIPHY_API_KEY
  const url = query
    ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=pg`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=${limit}&offset=${offset}&rating=pg`

  const res = await fetch(url)
  if (!res.ok) throw new Error('GIPHY request failed')
  const data = await res.json()
  return data.data.map(gif => ({
    id: gif.id,
    url: gif.images.original.url,
    preview: gif.images.downsized.url,
    width: parseInt(gif.images.original.width),
    height: parseInt(gif.images.original.height),
    title: gif.title,
  }))
}
