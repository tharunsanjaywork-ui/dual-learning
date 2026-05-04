export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

export function createPeerConnection() {
  return new RTCPeerConnection(ICE_SERVERS)
}

export async function getLocalStream() {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false })
}
