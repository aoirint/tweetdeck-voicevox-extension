let knownTweetIdQueueSize = 100
let knownTweetIdQueue = []
let textQueue = []
let tweetdeckTabId = null

chrome.runtime.onInstalled.addListener(() => {
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { method } = message
  console.log(`received message ${method} in background`)

  if (method === 'send-tweets') {
    const { tweets } = message
    const tabId = sender.tab.id
    tweetdeckTabId = tabId
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
  }

  return true
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
        console.log(tweetdeckTabId)

        // TODO: play audio with blob
        chrome.tabs.sendMessage(tweetdeckTabId, {
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
