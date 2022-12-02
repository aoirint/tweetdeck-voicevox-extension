console.log(`audio script loaded: ${location.href}`)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { method } = message
  console.log(`received message ${method}`)

  if (method === 'play-audio-data-url') {
    const { audioDataUrl } = message

    const audioElement = document.createElement('audio')
    audioElement.src = audioDataUrl

    document.body.appendChild(audioElement)
    audioElement.play()
    document.body.removeChild(audioElement)
  }
})
