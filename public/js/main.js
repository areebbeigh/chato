const socket = io.connect(`https://${window.location.hostname}:8081`)

let isInitiator = false
const mediaConstraints = {
  video: true, audio: false
}

const joinButton = document.querySelector('#joinButton')
const nicknameInput = document.querySelector('#nicknameInput')
const channelInput = document.querySelector('#channelInput')
const localVideo = document.querySelector('#localVideo')
const remoteVideo = document.querySelector('#remoteVideo')

joinButton.onclick = joinOrCreate

let nickname, channel, pc, localStream, dataChannel

function joinOrCreate() {
  nickname = nicknameInput.value
  channel = channelInput.value

  if (!nickname || !channel) {
    alert('Both fields are required!')
    return
  }

  socket.emit('join or create', { nickname, channel })
}

socket.on('created', function (data) {
  console.log('yooo')
  isInitiator = true
  setupMediaStream()
})

async function setupMediaStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    localVideo.srcObject = localStream
    createPeerConnection()
    sendMessage('got media stream')
  } catch (err) {
    console.error(err)
    console.log(err.message)
  }
}

socket.on('created', function (data) {
  console.log(`I'm the initiator`)
  isInitiator = true
  setupMediaStream()
})

// This peer is the joiner
socket.on('joined', function (data) {
  console.log(`I'm the joiner`)
  setupMediaStream()
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
    console.log('heere')
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
  // Setup data channel if isInitiatior with onopen onclose onmessage
  dataChannel = pc.createDataChannel('dataChannel')
  // Add datachannel callbacks
  dataChannel.onopen = handleDataChannelStateChange
  dataChannel.onclose = handleDataChannelStateChange
  dataChannel.onmessage = handleDataChannelMessage
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
  // nothing yet
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
    channel,
    ...message
  }

  socket.emit('message', msg)
}
