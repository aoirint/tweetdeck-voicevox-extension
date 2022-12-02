console.log(`content script loaded: ${location.href}`)

let watchingColumnIndex = null
let columnWatchIntervalId = null

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { method } = message
  console.log(`received message ${method} in content`)

  if (method === 'fetch-tweetdeck-columns') {
    const columnElements = [...document.querySelectorAll('#container > div > section')]
    const tweetdeckColumns = columnElements.map((columnElement) => {
      // Normal column
      const columnHeadingElement = columnElement.querySelector(':scope .column-heading')
      const columnAttributionElement = columnElement.querySelector(':scope .attribution')

      // Search column
      const columnTitleEditBoxElement = columnElement.querySelector(':scope .column-title-edit-box')

      let title = ''
      if (columnTitleEditBoxElement !== null) {
        title += `Search ${columnTitleEditBoxElement.value}`
      }
      
      if (columnHeadingElement !== null) {
        title += columnHeadingElement.innerText
      }
      if (columnHeadingElement !== null && columnAttributionElement !== null) {
        title += ' '
      }
      if (columnAttributionElement !== null) {
        title += `(${columnAttributionElement.innerText})`
      }

      return {
        title,
      }
    })

    sendResponse({
      tweetdeckColumns,
    })
  } else if (method === 'watch-tweetdeck-column') {
    if (columnWatchIntervalId !== null) {
      return
    }

    const { columnIndex } = message

    const columnElements = [...document.querySelectorAll('#container > div > section')]
    const columnElement = columnElements[columnIndex]

    watchingColumnIndex = columnIndex
    columnWatchIntervalId = setInterval(() => {
      const streamItems = [...columnElement.querySelectorAll(':scope .stream-item')]
      let tweets = streamItems.map((streamItem) => {
        const tweetId = parseInt(streamItem.dataset.tweetId)
        const tweetTextElement = streamItem.querySelector(':scope .tweet-text')
        const fullnameElement = streamItem.querySelector(':scope .fullname')

        return {
          tweetId,
          displayName: fullnameElement !== null ? fullnameElement.innerText : null,
          tweetText: tweetTextElement !== null ? tweetTextElement.innerText : null,
        }
      })

      tweets.sort((a, b) => a.tweetId - b.tweetId)

      chrome.runtime.sendMessage({
        method: 'send-tweets',
        tweets,
      })
    }, 1000)
  } else if (method === 'unwatch-tweetdeck-column') {
    if (columnWatchIntervalId === null) {
      return
    }

    clearInterval(columnWatchIntervalId)
    watchingColumnIndex = null
    columnWatchIntervalId = null
  }
})
