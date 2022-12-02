let knownTweetIdQueueSize = 100
let knownTweetIdQueue = []
let textQueue = []

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
      const text = `${displayName}さん ${tweetText}`

      textQueue.push(text)
    }

    // console.log(tweetQueue)
  } else if (method === 'open-audio-window') {
    const audioUrl = chrome.runtime.getURL('src/audio.html')

    chrome.windows.create({
      type: 'popup',
      focused: true,
      top: 1,
      left: 1,
      height: 1,
      width: 1,
      url: audioUrl,
    }, (win) => {
      audioWindowId = win.id
      audioTabId = win.tabs[0].id
    })
  }
})

// tweetQueue consumer
function consumeTweetQueue() {
  if (textQueue.length === 0) {
    setTimeout(consumeTweetQueue, 100)
    return
  }

  const text = textQueue.shift()

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

        // TODO: play audio with blob
        console.log(`audio tab id: ${audioTabId}`)
        chrome.tabs.sendMessage(audioTabId, {
          method: 'play-audio-data-url',
          audioDataUrl,
        })
      }
      reader.readAsDataURL(blob)
    })

    // setTimeout(consumeTweetQueue, 100)
  })

}

consumeTweetQueue()
