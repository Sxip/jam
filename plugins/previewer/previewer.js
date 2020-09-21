const { server } = window.opener.core

/**
 * Elements
 */
const item = document.getElementById('item')
const color = document.getElementById('color')
const slot = document.getElementById('slot')

/**
 * Spawns the item
 */
const spawn = () => {
  const itemText = item.value
  const slotText = slot.value
  const colorText = color.value

  server.session.localWrite(`%xt%ti%-1%1%1%1%0%${itemText}%${slotText}%${colorText}%1%0%259%`)
}
