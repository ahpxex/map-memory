import { useState, useRef, useEffect, type ReactNode } from 'react'

interface TooltipProps {
  children: ReactNode
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ 
  children, 
  content, 
  placement = 'top',
  delay = 200 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const show = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsMounted(true)
      // Small delay to allow mount before transition
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
    }, delay)
  }

  const hide = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
    timeoutRef.current = window.setTimeout(() => {
      setIsMounted(false)
    }, 150)
  }

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-t-transparent border-b-transparent border-l-transparent',
  }

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isMounted && (
        <div
          ref={tooltipRef}
          className={`pointer-events-none absolute z-50 whitespace-nowrap ${placementClasses[placement]}`}
        >
          <div
            className={`rounded-md bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-all duration-150 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
            }`}
          >
            {content}
          </div>
          <div
            className={`absolute h-0 w-0 border-4 border-stone-800 ${arrowClasses[placement]}`}
          />
        </div>
      )}
    </div>
  )
}
