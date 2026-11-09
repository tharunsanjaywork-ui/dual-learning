// Verification script for YouTube video IDs using YouTube oEmbed API
import {
  jeeMainsVideos,
  jeeAdvancedVideos,
  neetVideos,
  caVideos,
  categoryPlaylists
} from '../src/data/videos.js'

async function verifyVideo(id) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
  try {
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      return { id, valid: true, title: data.title, author: data.author_name }
    } else {
      return { id, valid: false, status: res.status }
    }
  } catch (err) {
    return { id, valid: false, error: err.message }
  }
}

async function run() {
  console.log('======================================================================')
  console.log('   DUALZONE VIDEO CATALOG VERIFICATION via YouTube oEmbed API       ')
  console.log('======================================================================\n')

  const categories = {
    'JEE Mains': jeeMainsVideos,
    'JEE Advanced': jeeAdvancedVideos,
    'NEET': neetVideos,
    'CA Foundation': caVideos,
  }

  const categoryKeys = {
    'JEE Mains': 'jee-mains',
    'JEE Advanced': 'jee-advanced',
    'NEET': 'neet',
    'CA Foundation': 'ca',
  }

  const summary = []

  for (const [catName, vids] of Object.entries(categories)) {
    console.log(`\n▶ CATEGORY: ${catName} (${vids.length} videos)`)
    console.log('----------------------------------------------------------------------')
    
    // Group by subject
    const subjectMap = {}
    for (const v of vids) {
      if (!subjectMap[v.subject]) subjectMap[v.subject] = []
      subjectMap[v.subject].push(v)
    }

    let catPassed = 0

    for (const [subj, items] of Object.entries(subjectMap)) {
      console.log(`\n  [Subject: ${subj}] (${items.length} videos)`)
      for (const item of items) {
        const result = await verifyVideo(item.id)
        if (result.valid) {
          console.log(`  ✅ [VALID] ${item.id} | ${result.author} | "${result.title.substring(0, 50)}..."`)
          catPassed++
        } else {
          console.log(`  ❌ [FAIL]  ${item.id} | Status: ${result.status || result.error}`)
        }
      }
    }

    const key = categoryKeys[catName]
    const playlists = categoryPlaylists[key] || []
    console.log(`\n  [Playlists for ${catName}]: ${playlists.length} playlists defined`)
    for (const p of playlists) {
      console.log(`  📁 [PLAYLIST] ${p.id} (${p.subject}) - "${p.title}" by ${p.channel}`)
    }

    summary.push({
      category: catName,
      subjects: Object.keys(subjectMap).length,
      videosCount: vids.length,
      verifiedCount: catPassed,
      playlistsCount: playlists.length,
      status: (catPassed === vids.length && vids.length >= 12 && Object.keys(subjectMap).length >= 3 && playlists.length >= 3) ? '100% PASS' : 'FAIL',
    })
  }

  console.log('\n======================================================================')
  console.log('                   FINAL VERIFICATION COUNT TABLE                     ')
  console.log('======================================================================')
  console.table(summary)
}

run()
