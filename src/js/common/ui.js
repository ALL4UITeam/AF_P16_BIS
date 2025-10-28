
export function toggleTab(tabSelector) {
  const tabs = document.querySelectorAll(tabSelector)
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      console.log('✅ 탭 전환:', tab.textContent)
    })
  })
}

export function buttonClick(buttonSelector) {
  const buttons = document.querySelectorAll(buttonSelector)
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      console.log('✅ 버튼 클릭:', button.textContent)
    })
  })
}
