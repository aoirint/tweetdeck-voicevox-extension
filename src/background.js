let knownTweetIdQueueSize = 100
let knownTweetIdQueue = []

let textQueue = []

let audioQueueSize = 10
let audioQueue = []
let waitingPlayEnded = false

chrome.runtime.onInstalled.addListener(() => {
})

let audioWindowId = null
let audioTabId = null

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { method } = message
  console.log(`received message ${method} in background`)

  if (method === 'send-tweets') {
    const { tweets } = message
    const tabId = sender.tab.id
    // console.log(tweets)

    for (const tweet of tweets) {
      const { tweetId } = tweet
      if (knownTweetIdQueue.includes(tweetId)) {
        continue
      }

      knownTweetIdQueue.push(tweetId)
      if (knownTweetIdQueueSize < knownTweetIdQueue.length) {
        knownTweetIdQueue.shift() // keep max size
      }

      const { displayName, tweetText } = tweet
      const tweetTextShort = tweetText.substring(0, 25) // limit 25 chars
      const text = `${displayName}さん ${tweetTextShort}`

      textQueue.push({
        text,
      })
    }

    // console.log(tweetQueue)
  } else if (method === 'open-audio-window') {
    const audioUrl = chrome.runtime.getURL('src/audio.html')

    chrome.windows.create({
      type: 'popup',
      focused: true,
      width: 400,
      height: 400,
      url: audioUrl,
    }, (win) => {
      audioWindowId = win.id
      audioTabId = win.tabs[0].id
    })
  } else if (method === 'fetch-queue') {
    sendResponse({
      textQueue: textQueue.map(({ text }) => ({
        text,
      })),
      audioQueue: audioQueue.map(({ text }) => ({
        text,
      }))
    })
  } else if (method === 'ended-play-audio') {
    setTimeout(consumeAudioQueue, 100)
  }
})

// textQueue consumer
function consumeTextQueue() {
  if (textQueue.length === 0) {
    setTimeout(consumeTextQueue, 100)
    return
  }
  if (audioQueueSize <= audioQueue.length) {
    setTimeout(consumeTextQueue, 100)
    return
  }

  const { text } = textQueue.shift()

  const audioQueryUrl = new URL('http://127.0.0.1:50021/audio_query')
  audioQueryUrl.searchParams.append('speaker', '1')
  audioQueryUrl.searchParams.append('text', text)

  fetch(audioQueryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then((response) => response.json())
  .then((query) => {
    const synthesisUrl = new URL('http://127.0.0.1:50021/synthesis')
    synthesisUrl.searchParams.append('speaker', '1')

    fetch(synthesisUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/wav',
      },
      body: JSON.stringify(query),
    })
    .then((response) => response.blob())
    .then((blob) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const audioDataUrl = event.target.result

        audioQueue.push({
          text,
          audioDataUrl,
        })

        setTimeout(consumeTextQueue, 100)
      }
      reader.readAsDataURL(blob)
    })
  })
}

// audioQueue consumer
function consumeAudioQueue() {
  if (audioQueue.length === 0) {
    setTimeout(consumeAudioQueue, 100)
    return
  }
  if (audioTabId === null) {
    setTimeout(consumeAudioQueue, 100)
    return
  }

  const { audioDataUrl } = audioQueue.shift()

  waitingPlayEnded = true
  chrome.tabs.sendMessage(audioTabId, {
    method: 'play-audio-data-url',
    audioDataUrl,
  })

  // setTimeout(consumeAudioQueue, 100)
}

consumeTextQueue()
consumeAudioQueue()
