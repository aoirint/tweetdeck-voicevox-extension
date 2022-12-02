console.log(`audio script loaded: ${location.href}`)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { method } = message
  console.log(`received message ${method} in audio`)

  if (method === 'play-audio-data-url') {
    const { audioDataUrl } = message

    const audioElement = document.createElement('audio')
    audioElement.src = audioDataUrl
    audioElement.onended = () => {
      chrome.runtime.sendMessage({
        method: 'ended-play-audio',
      })
    }

    document.body.appendChild(audioElement)
    audioElement.play()
  }
})

setInterval(() => {
  chrome.runtime.sendMessage({
    method: 'fetch-queue',
  }, ({ textQueue, audioQueue }) => {
    // update textQueueTable
    while (textQueueTable.lastChild) {
      textQueueTable.removeChild(textQueueTable.lastChild)
    }

    const headRowElement = document.createElement('tr')

    const headColumnNumberElement = document.createElement('th')
    headColumnNumberElement.innerText = 'No'
    headRowElement.appendChild(headColumnNumberElement)

    const headColumnTextElement = document.createElement('th')
    headColumnTextElement.innerText = 'テキスト'
    headRowElement.appendChild(headColumnTextElement)

    textQueueTable.appendChild(headRowElement)

    for (const textQueueIndex in textQueue) {
      const { text } = textQueue[textQueueIndex]
      const rowElement = document.createElement('tr')

      const columnNumberElement = document.createElement('th')
      columnNumberElement.innerText = `${textQueueIndex}`
      rowElement.appendChild(columnNumberElement)
  
      const columnTextElement = document.createElement('th')
      columnTextElement.innerText = `${text}`
      rowElement.appendChild(columnTextElement)

      textQueueTable.appendChild(rowElement)
    }

    // update audioQueueTable
    while (audioQueueTable.lastChild) {
      audioQueueTable.removeChild(audioQueueTable.lastChild)
    }

    const audioHeadRowElement = document.createElement('tr')

    const audioHeadColumnNumberElement = document.createElement('th')
    audioHeadColumnNumberElement.innerText = 'No'
    audioHeadRowElement.appendChild(audioHeadColumnNumberElement)

    const audioHeadColumnTextElement = document.createElement('th')
    audioHeadColumnTextElement.innerText = 'テキスト'
    audioHeadRowElement.appendChild(audioHeadColumnTextElement)

    audioQueueTable.appendChild(audioHeadRowElement)

    for (const audioQueueIndex in audioQueue) {
      const { text } = audioQueue[audioQueueIndex]
      const rowElement = document.createElement('tr')

      const columnNumberElement = document.createElement('th')
      columnNumberElement.innerText = `${audioQueueIndex}`
      rowElement.appendChild(columnNumberElement)
  
      const columnTextElement = document.createElement('th')
      columnTextElement.innerText = `${text}`
      rowElement.appendChild(columnTextElement)

      audioQueueTable.appendChild(rowElement)
    }
  })
}, 100)
