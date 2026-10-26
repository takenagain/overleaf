import {
  Group,
  Panel as ResizablePanel,
  Separator,
  useDefaultLayout,
  type GroupProps,
  type PanelProps,
  type PanelImperativeHandle,
  type SeparatorProps,
} from 'react-resizable-panels'
import { forwardRef, useEffect, useRef } from 'react'

export type ImperativePanelHandle = PanelImperativeHandle

// Keep application sizes in percentages: current versions interpret numbers as pixels.
const percentage = (size: number | string | undefined) =>
  typeof size === 'number' ? `${size}%` : size

export function PanelGroup({
  autoSaveId,
  direction,
  ...props
}: Omit<GroupProps, 'orientation'> & {
  autoSaveId: string
  direction: 'horizontal' | 'vertical'
}) {
  // The library also reads the legacy persisted layout format on first load.
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: autoSaveId,
  })
  return (
    <Group
      {...props}
      orientation={direction}
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      resizeTargetMinimumSize={{ coarse: 0, fine: 0 }}
    />
  )
}

export const Panel = forwardRef<
  PanelImperativeHandle,
  PanelProps & {
    order?: number
    onExpand?: () => void
    onCollapse?: () => void
    tagName?: string
  }
>(function Panel(
  {
    order: _order,
    tagName,
    onExpand,
    onCollapse,
    onResize,
    className,
    minSize,
    maxSize,
    defaultSize,
    collapsedSize,
    ...props
  },
  ref
) {
  return (
    <ResizablePanel
      {...props}
      panelRef={ref}
      // Keep classes on the flex item, including visibility and positioning classes.
      elementRef={element => {
        if (element) element.className = className ?? ''
      }}
      role={tagName === 'section' ? 'region' : props.role}
      minSize={percentage(minSize)}
      maxSize={percentage(maxSize)}
      defaultSize={percentage(defaultSize)}
      collapsedSize={percentage(collapsedSize)}
      onResize={(size, id, previous) => {
        onResize?.(size, id, previous)
        if (props.collapsible) {
          const collapsed = size.asPercentage === Number(collapsedSize ?? 0)
          const wasCollapsed =
            previous && previous.asPercentage === Number(collapsedSize ?? 0)
          if (collapsed && !wasCollapsed) onCollapse?.()
          else if (!collapsed && (wasCollapsed || !previous)) onExpand?.()
        }
      }}
    />
  )
})

export type PanelResizeHandleProps = SeparatorProps & {
  onDragging?: (dragging: boolean) => void
  hitAreaMargins?: { coarse: number; fine: number }
}

export function PanelResizeHandle({
  onDragging,
  hitAreaMargins: _hitAreaMargins,
  onPointerDown,
  ...props
}: PanelResizeHandleProps) {
  const dragging = useRef(false)
  const onDraggingRef = useRef(onDragging)
  onDraggingRef.current = onDragging
  useEffect(() => {
    const stop = () => {
      if (dragging.current) {
        dragging.current = false
        onDraggingRef.current?.(false)
      }
    }
    document.addEventListener('pointerup', stop)
    document.addEventListener('pointercancel', stop)
    return () => {
      document.removeEventListener('pointerup', stop)
      document.removeEventListener('pointercancel', stop)
      stop()
    }
  }, [])
  return (
    <Separator
      {...props}
      disableDoubleClick
      onPointerDown={event => {
        onPointerDown?.(event)
        if (!props.disabled && event.button === 0) {
          dragging.current = true
          onDraggingRef.current?.(true)
        }
      }}
    />
  )
}
