const production = true
const socketServerUrl = production ? `https://${window.location.href}:8080` : `https://8080-performjealousshrew.cdr.co/`
const socket = io.connect(socketServerUrl)

let pc, localStream, localAudioTrack, localVideoTrack, dataChannel
let isInitiator = false

const mediaConstraints = {
  video: {
    facingMode: 'user'
  }, 
  audio: true
}

const clipboard = new ClipboardJS('.copy-location')
const chatArea = document.querySelector('#chatArea')
const msgBox = document.querySelector('#msgBox')
const chatInput = document.querySelector('#chatInput')
const localVideo = document.querySelector('#localVideo')
const remoteVideo = document.querySelector('#remoteVideo')

function getRoom () {
  return window.location.pathname.slice(1) || null
}

function getRoomUrl () {
  return `https://${window.location.host}/${getRoom()}`
}

function joinOrCreate() {
  const room = getRoom()

  if (room) {
    socket.emit('join or create', room)
  } else {
    socket.emit('join or create')
  }
}

async function setupMediaStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    localVideo.srcObject = localStream
    localAudioTrack = localStream.getAudioTracks()[0]
    localVideoTrack = localStream.getVideoTracks()[0]
    createPeerConnection()
    sendMessage('got media stream')
  } catch (err) {
    console.error(err)
    console.log(err.message)
  }
}

socket.on('created', function (room) {
  console.log(`I'm the initiator`)
  history.pushState('', 'chato', `/${room}`)
  isInitiator = true
  setupMediaStream()
  disconnectedFromPeer()
})

// This peer is the joiner
socket.on('joined', function (room) {
  console.log(`I'm the joiner`)
  history.pushState('', 'chato', `/${room}`)
  setupMediaStream()
})

// Room doesn't exist
socket.on('invalid_room', function () {
  alert(`This room does not exist. You'll be redirected to a new empty one!`)
  window.location = `https://${window.location.host}`
})

socket.on('peer_disconnected', function () {
  console.log('peer disconnected.')
  disconnectedFromPeer()
  isInitiator = true
})

// Initiator gets join message on peer join
socket.on('join', connectedToPeer)

// Room is full (2 clients)
socket.on('full', function () {
  alert('This room is already full')
  window.location = `https://${window.location.host}`
})

socket.on('message', function (message) {
  switch (message.type) {
    // This is the peer
    case 'offer':
      // Set remote peer connection
      pc.setRemoteDescription(message.description)
      // Create an answer
      createAnswer()
      break

    // This is the initiator
    case 'answer':
      // Set the remote peer connection
      pc.setRemoteDescription(message.description)
      break

    case 'candidate':
      // Add ice candidate to peerConnection. This starts the communcation!
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      })
      pc.addIceCandidate(candidate)
      break
  }
  
  // Peer successfully set up his local media stream
  if (message.message == 'got media stream') {
    createPeerConnection()
    if (isInitiator) {
      createOffer()
    }
  }
})

const pcConfig = { iceServers: [{ url: 'stun:stun.l.google.com:19302' }] }
const pcConstraints = {
  optional: [
    { DtlsSrtpKeyAgreement: true }
  ]
}
const sdpConstraints = {}

function createPeerConnection () {
  // The channel is ready
  isChannelReady = true
  // Create a new peer connection
  pc = new RTCPeerConnection(pcConfig, pcConstraints)
  // Add local stream
  pc.addStream(localStream)
  // Add ice candidate event handler - sends any new ice candidates to server
  pc.onicecandidate = handleIceCandidate
  // Add onstream handler - add / remove remote stream to remoteVideo
  pc.onaddstream = handleRemoteStreamAdded
  pc.onremovestream = handleRemoteStreamRemoved
  if (isInitiator) {
    // Setup data channel if isInitiatior with onopen onclose onmessage
    dataChannel = pc.createDataChannel('dataChannel')
    // Add datachannel callbacks
    dataChannel.onopen = handleDataChannelStateChange
    dataChannel.onclose = handleDataChannelStateChange
    dataChannel.onmessage = handleDataChannelMessage
  } else {
    pc.ondatachannel = gotDataChannel
  }
}

function handleIceCandidate (event) {
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    })
  }
}

function handleRemoteStreamAdded (event) {
  remoteVideo.srcObject = event.stream
}

function handleRemoteStreamRemoved (event) {
  // nothing yet
}

function handleDataChannelStateChange (event) {
  // nothing yet
}

function handleDataChannelMessage (event) {
  appendChatMessage(event.data, false)
}

function sendChatData () {
  console.log('Sending chat data')
  const msg = chatInput.value
  if (msg) {
    dataChannel.send(msg)
    appendChatMessage(msg, true)
    chatInput.value = ''
  }
}

function appendChatMessage(msg, isInitiatior) {
  const node = document.createElement('p')
  node.className = isInitiatior ? 'initiatorMsg' : 'joinerMsg'
  node.textContent = msg
  msgBox.appendChild(node)
  msgBox.scrollTop = msgBox.scrollHeight
}

function gotDataChannel (event) {
  console.log('Got data channel')
  dataChannel = event.channel
  dataChannel.onopen = handleDataChannelStateChange
  dataChannel.onclose = handleDataChannelStateChange
  dataChannel.onmessage = handleDataChannelMessage
}

async function createOffer() {
  try {
    const description = await pc.createOffer(sdpConstraints)
    pc.setLocalDescription(description)

    sendMessage({
      type: 'offer',
      description
    })
  } catch (err) {
    console.error(err)
  }
}

async function createAnswer() {
  try {
    const description = await pc.createAnswer({})
    pc.setLocalDescription(description)

    sendMessage({
      type: 'answer',
      description
    })
  } catch (err) {
    console.error(err)
  }
}

function sendMessage(message) {
  if (typeof(message) === 'string') {
    message = { message }
  }

  const msg = {
    room: getRoom(),
    ...message
  }

  socket.emit('message', msg)
}

function toggleMic () {
  const btnIcon = document.querySelector('#btnMicToggle').querySelector('i')

  if (localStream.getAudioTracks().length) {
    localStream.removeTrack(localAudioTrack)
    btnIcon.innerHTML = 'mic_off'
  } else {
    localStream.addTrack(localAudioTrack)
    btnIcon.innerHTML = 'mic'
  }
}

function toggleCam () {
  const btnIcon = document.querySelector('#btnCamToggle').querySelector('i')

  if (localStream.getVideoTracks().length) {
    localStream.removeTrack(localVideoTrack)
    btnIcon.innerHTML = 'videocam_off'
    localVideo.src = ''
  } else {
    localStream.addTrack(localVideoTrack)
    btnIcon.innerHTML = 'videocam'
    localVideo.srcObject = localStream
  }
}

function toggleChat () {
  const btnIcon = document.querySelector('#btnChatToggle').querySelector('i')

  chatArea.hidden = !chatArea.hidden
  if (chatArea.hidden) {
    btnIcon.innerHTML = 'speaker_notes_off'
  } else [
    btnIcon.innerHTML = 'message'
  ]
}

function copyRoomUrl () {

}

function displayLonelyToast () {
  let toastHtml = `
  <span>
    You're alone :(
  </span>
  <button
    data-clipboard-text="${window.location.href}"
    class="btn-flat toast-action blue-text copy-location"
    onclick="copyRoomUrl()">
    Copy room URL
  </button>`
  M.toast({ html: toastHtml, displayLength: Infinity, classes: 'lonely-toast' })
}

function disconnectedFromPeer () {
  displayLonelyToast()
  remoteVideo.src = ''
}

function connectedToPeer () {
  M.Toast.dismissAll()
}

function main () {
  toggleChat()
  joinOrCreate()
  chatInput.addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      sendChatData()
    }
  })
}

main()
