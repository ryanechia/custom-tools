import { createRouter, createWebHistory } from 'vue-router'
import XlsxToCsv from '../views/XlsxToCsv.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/xlsxtocsv',
    },
    {
      path: '/xlsxtocsv',
      name: 'XlsxToCsv',
      component: XlsxToCsv,
    }
  ],
})

export default router
