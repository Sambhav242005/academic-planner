'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

export function LoadingBar() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname
    setVisible(true)
    setProgress(0)

    const t1 = setTimeout(() => setProgress(40), 50)
    const t2 = setTimeout(() => setProgress(70), 300)
    const t3 = setTimeout(() => setProgress(90), 600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [pathname])

  useEffect(() => {
    if (progress >= 90) {
      const t = setTimeout(() => {
        setProgress(100)
        const t2 = setTimeout(() => {
          setVisible(false)
          setProgress(0)
        }, 200)
        return () => clearTimeout(t2)
      }, 100)
      return () => clearTimeout(t)
    }
  }, [progress])

  if (!visible && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-primary transition-[width,opacity] duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 0 ? 0 : 1,
        }}
      />
    </div>
  )
}
