import { cn } from "@/lib/utils"
import { Check, ChevronDown, X } from "lucide-react"
import * as React from "react"
import { Button } from "./button"

const MultiSelect = React.forwardRef(({
  options = [],
  value = [],
  onChange,
  placeholder = "请选择...",
  className,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef(null)

  // 处理键盘按键
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // 处理点击外部关闭
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [isOpen])

  const handleSelect = (optionValue) => {
    const currentValue = Array.isArray(value) ? value : []
    const newValue = currentValue.includes(optionValue)
      ? currentValue.filter(v => v !== optionValue)
      : [...currentValue, optionValue]
    onChange?.(newValue)
  }

  const handleRemove = (optionValue) => {
    const currentValue = Array.isArray(value) ? value : []
    const newValue = currentValue.filter(v => v !== optionValue)
    onChange?.(newValue)
  }

  const safeOptions = Array.isArray(options) ? options : []
  const safeValue = Array.isArray(value) ? value : []
  const selectedOptions = safeOptions.filter(option => safeValue.includes(option.value))

  return (
    <div
      className={cn("relative", className)}
      ref={(node) => {
        containerRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      }}
      {...props}
    >
      {/* 主选择框 */}
      <Button
        type="button"
        variant="outline"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="w-full justify-between h-auto min-h-[40px] px-3 py-2"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map(option => (
              <div
                key={option.value}
                className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md flex items-center gap-1"
              >
                {option.label}
                <X
                  className="w-3 h-3 cursor-pointer hover:bg-white/20 rounded"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleRemove(option.value)
                  }}
                />
              </div>
            ))
          )}
        </div>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      {/* 下拉选项 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {safeOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              暂无选项
            </div>
          ) : (
            safeOptions.map(option => (
              <div
                key={option.value}
                className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelect(option.value)
                }}
              >
                <div className="flex items-center justify-center w-4 h-4 mr-2">
                  {safeValue.includes(option.value) && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <span className="flex-1">{option.label}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
})

MultiSelect.displayName = "MultiSelect"

export { MultiSelect }

