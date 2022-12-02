let knownTweetIdQueueSize = 100
let knownTweetIdQueue = []

let textQueue = []

let textGeneratingQueue = []

let audioQueueSize = 10
let audioQueue = []

let audioPlayingQueue = []

let waitingPlayEnded = false

chrome.runtime.onInstalled.addListener(() => {
})

let audioWindowId = null
let audioTabId = null


// update declarativeNetRequest rule
chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1],
  addRules: [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { 'header': 'Origin', 'operation': 'remove' },
        ],
      },
      condition: {
        urlFilter: '127.0.0.1:50021/*',
        initiatorDomains: [chrome.runtime.id], // chrome-extension://{extension_id}
      },
    },
  ],
})


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

      // limit 25 chars
      const tweetTextShort = tweetText.length > 25 ? (tweetText.substring(0, 25) + ' 以下略') : tweetText

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
      textGeneratingQueue: textGeneratingQueue.map(({ text }) => ({
        text,
      })),
      audioQueue: audioQueue.map(({ text }) => ({
        text,
      })),
      audioPlayingQueue: audioPlayingQueue.map(({ text }) => ({
        text,
      })),
    })
  } else if (method === 'ended-play-audio') {
    audioPlayingQueue.shift()
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

  const textQueueItem = textQueue.shift()
  textGeneratingQueue.push(textQueueItem)

  const { text } = textQueueItem

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

        textGeneratingQueue.shift()
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

  const audioQueueItem = audioQueue.shift()
  audioPlayingQueue.push(audioQueueItem)

  const { audioDataUrl } = audioQueueItem

  waitingPlayEnded = true
  chrome.tabs.sendMessage(audioTabId, {
    method: 'play-audio-data-url',
    audioDataUrl,
  })

  // setTimeout(consumeAudioQueue, 100)
}

consumeTextQueue()
consumeAudioQueue()
