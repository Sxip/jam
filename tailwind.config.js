/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        'primary-bg': '#181A20',
        'secondary-bg': '#1C1E26',
        'tertiary-bg': '#3A3D4D',
        'text-primary': '#C3C3C3',
        'highlight-yellow': '#f0b429',
        'highlight-green': '#38b000',
        'highlight-blue': '#335fff',
        'sidebar-bg': '#1C1E26',
        'sidebar-border': '#3A3D4D',
        'custom-pink': '#F10048',
        'sidebar-text': '#C3C3C3',
        'sidebar-hover': '#2C2E34',
        'error-red': '#FF4D4F',
        'custom-blue': '#7785cc',
        'peachy-beige': '#FCE8C7'
      }
    }
  },
  content: [
    './src/**/*.{html,js}',
    './plugins/**/*.{html,js}'
  ]
}
