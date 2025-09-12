"use client"

import { useEffect, useRef } from "react"

interface CircleChartProps {
  percentage: number
  color: string
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
}

export function CircleChart({ 
  percentage, 
  color, 
  size = 120, 
  strokeWidth = 8,
  className = "",
  children 
}: CircleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Hintergrundkreis */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Fortschrittskreis */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            strokeDasharray,
            strokeDashoffset
          }}
        />
      </svg>
      
      {/* Inhalt in der Mitte */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
