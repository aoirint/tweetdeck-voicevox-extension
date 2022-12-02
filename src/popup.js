console.log(`popup script loaded: ${location.href}`)

let tweetdeckColumns = []

chrome.tabs.query({
  active: true,
  currentWindow: true,
}, ([activeTab]) => {
  chrome.tabs.sendMessage(activeTab.id, {
    method: 'fetch-tweetdeck-columns'
  }, (message) => {
    console.log(`received message ${message} in popup`)

    tweetdeckColumns = message.tweetdeckColumns
    console.log(tweetdeckColumns)

    // reset column select options
    while (columnSelect.lastChild) {
      columnSelect.removeChild(columnSelect.lastChild)
    }
    tweetdeckColumns.forEach(({ title }, index) => {
      const optionElement = document.createElement('option')
      optionElement.value = index
      optionElement.innerText = title

      columnSelect.appendChild(optionElement)
    })
  })
})

startButton.addEventListener('click', () => {
  console.log('start button clicked')
  const selectedIndex = columnSelect.value

  chrome.tabs.query({
    active: true,
    currentWindow: true,
  }, ([activeTab]) => {
    chrome.tabs.sendMessage(activeTab.id, {
      method: 'watch-tweetdeck-column',
      columnIndex: selectedIndex,
    })
  })
})

stopButton.addEventListener('click', () => {
  console.log('stop button clicked')

  chrome.tabs.query({
    active: true,
    currentWindow: true,
  }, ([activeTab]) => {
    chrome.tabs.sendMessage(activeTab.id, {
      method: 'unwatch-tweetdeck-column',
    })
  })
})
