import { Drawer as AntdDrawer } from 'antd'
import { useEffect, useState } from 'react'

import WidgetRenderer from '../../components/WidgetRenderer'

import { DrawerProvider } from './DrawerContext'

interface DrawerProps {
  widgetEndpoint: string
  size?: 'default' | 'large' | undefined
  title?: string | undefined
}

export const openDrawer = (properties: DrawerProps) => {
  window.dispatchEvent(new CustomEvent('openDrawer', { detail: properties }))
}

export const closeDrawer = () => {
  window.dispatchEvent(new CustomEvent('closeDrawer'))
}

const Drawer = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [properties, setProperties] = useState<DrawerProps | null>(null)
  const [drawerData, setDrawerData] = useState<{ title?: string; extra?: React.ReactNode }>({})

  useEffect(() => {
    const handleOpenDrawer = (event: CustomEvent<DrawerProps>) => {
      setProperties(event.detail)
      setIsOpen(true)
    }

    const handleCloseDrawer = () => {
      setIsOpen(false)
    }

    window.addEventListener('openDrawer', handleOpenDrawer as EventListener)
    window.addEventListener('closeDrawer', handleCloseDrawer)

    return () => {
      window.removeEventListener('openDrawer', handleOpenDrawer as EventListener)
      window.removeEventListener('closeDrawer', handleCloseDrawer)
    }
  }, [])

  if (!properties) {
    return null
  }

  const { size, title, widgetEndpoint } = properties

  return (
    <AntdDrawer
      destroyOnHidden
      extra={drawerData.extra}
      key={
        /* This make sure that the content of the drawer is destroyed and recreated when
        the drawer is closed and reopened, to prevent the form from showing stale data
        */
        isOpen ? 'open' : 'closed'
      }
      onClose={() => {
        setIsOpen(false)
        setDrawerData({})
      }}
      open={isOpen}
      // Inset the drawer's right edge by the docked Autopilot rail width (a :root var the rail
      // publishes; 0 when the rail is closed/absent) so the mask + panel cover the content and
      // never sit over the rail — honouring "the rail is never overlaid".
      rootStyle={{ right: 'var(--autopilot-rail-width, 0px)' }}
      size={size || 'default'}
      title={drawerData.title || title}
    >
      <DrawerProvider setDrawerData={setDrawerData}>
        <WidgetRenderer key={'drawer'} widgetEndpoint={widgetEndpoint} />
      </DrawerProvider>
    </AntdDrawer>
  )
}

export default Drawer
