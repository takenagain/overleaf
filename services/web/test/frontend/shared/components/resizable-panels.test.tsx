import { createRef } from 'react'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { expect } from 'chai'
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from '@/shared/components/resizable-panels'

describe('resizable editor panels', function () {
  const width = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetWidth'
  )
  const height = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight'
  )

  beforeEach(function () {
    localStorage.clear()
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 1000,
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 500,
    })
  })

  afterEach(function () {
    cleanup()
    if (width)
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', width)
    else delete (HTMLElement.prototype as any).offsetWidth
    if (height)
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height)
    else delete (HTMLElement.prototype as any).offsetHeight
  })

  it('preserves percentage constraints and exposes collapse and expand', function () {
    const ref = createRef<ImperativePanelHandle>()
    const { getByTestId } = render(
      <PanelGroup autoSaveId="editor-test" direction="horizontal">
        <Panel
          id="sidebar"
          className="sidebar"
          defaultSize={25}
          minSize={10}
          collapsible
          ref={ref}
        >
          Sidebar
        </Panel>
        <PanelResizeHandle />
        <Panel id="editor" defaultSize={75}>
          Editor
        </Panel>
      </PanelGroup>
    )
    expect(getByTestId('sidebar').classList.contains('sidebar')).to.equal(true)
    expect(ref.current?.isCollapsed()).to.equal(false)
    expect(ref.current?.getSize().asPercentage).to.equal(25)
    act(() => ref.current?.collapse())
    expect(ref.current?.isCollapsed()).to.equal(true)
    act(() => ref.current?.expand())
    expect(ref.current?.isCollapsed()).to.equal(false)
  })

  it('restores and updates an existing persisted layout', async function () {
    localStorage.setItem(
      'react-resizable-panels:editor-test',
      JSON.stringify({ 'sidebar,editor': { layout: [30, 70] } })
    )
    const ref = createRef<ImperativePanelHandle>()
    render(
      <PanelGroup autoSaveId="editor-test" direction="horizontal">
        <Panel id="sidebar" defaultSize={25} ref={ref}>
          Sidebar
        </Panel>
        <PanelResizeHandle />
        <Panel id="editor" defaultSize={75}>
          Editor
        </Panel>
      </PanelGroup>
    )
    // getSize reads the committed layout, independent of JSDOM's mock element dimensions.
    expect(ref.current?.getSize().asPercentage).to.equal(30)
    act(() => ref.current?.resize('40%'))
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('react-resizable-panels:editor-test')!)
      expect(saved.sidebar).to.equal(40)
      expect(saved.editor).to.equal(60)
    })
  })
  it('reports drag start and release', function () {
    const states: boolean[] = []
    const { getByRole } = render(
      <PanelGroup autoSaveId="drag-test" direction="horizontal">
        <Panel id="left">Left</Panel>
        <PanelResizeHandle onDragging={dragging => states.push(dragging)} />
        <Panel id="right">Right</Panel>
      </PanelGroup>
    )
    fireEvent(getByRole('separator'), new MouseEvent('pointerdown', { button: 0, bubbles: true }))
    fireEvent(document, new MouseEvent('pointerup', { bubbles: true }))
    expect(states).to.deep.equal([true, false])
  })
})
