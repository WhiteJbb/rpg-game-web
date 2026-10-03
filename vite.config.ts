import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : GitHub Pages의 하위 경로(/저장소명/)에서도 그대로 동작
export default defineConfig({
  base: './',
  plugins: [react()],
})
