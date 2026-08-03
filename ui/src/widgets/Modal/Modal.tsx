import { Modal as AntDModal } from 'antd'
import { useEffect, useState } from 'react'

import WidgetRenderer from '../../components/WidgetRenderer'

import styles from './Modal.module.css'

interface ModalProps {
  widgetEndpoint: string
  size?: 'default' | 'large' | 'fullscreen' | 'custom'
  title?: string | undefined
  customWidth?: string
}

export const openModal = (properties: ModalProps) => {
  window.dispatchEvent(new CustomEvent('openModal', { detail: properties }))
}

export const closeModal = () => {
  window.dispatchEvent(new CustomEvent('closeModal'))
}

const Modal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [properties, setProperties] = useState<ModalProps | null>(null)

  useEffect(() => {
    const handleOpenModal = (event: CustomEvent<ModalProps>) => {
      setProperties(event.detail)
      setIsOpen(true)
    }

    const handleCloseModal = () => {
      setIsOpen(false)
    }

    window.addEventListener('openModal', handleOpenModal as EventListener)
    window.addEventListener('closeModal', handleCloseModal)

    return () => {
      window.removeEventListener('openModal', handleOpenModal as EventListener)
      window.removeEventListener('closeModal', handleCloseModal)
    }
  }, [])

  if (!properties) {
    return null
  }

  const { customWidth, size = 'default', title, widgetEndpoint } = properties

  const modalClassName = `
    ${styles.modal}
    ${size === 'large' ? styles.modalLarge : ''}
    ${size === 'fullscreen' ? styles.modalFullscreen : ''}
    ${!size || size === 'default' ? styles.modalDefault : ''}
  `.trim()

  let computedWidth: string | undefined
  if (size === 'custom' && customWidth) {
    if (/^\d+$/.test(customWidth)) {
      computedWidth = `${customWidth}px`
    } else {
      computedWidth = customWidth
    }
  }

  return (
    <AntDModal
      className={modalClassName}
      footer={null}
      key={
        /* This makes sure that the content of the modal is destroyed and recreated when
        the modal is closed and reopened, to prevent the form from showing stale data
        */
        isOpen ? 'open' : 'closed'
      }
      onCancel={() => setIsOpen(false)}
      open={isOpen}
      title={title}
      width={computedWidth}
      wrapClassName={size === 'fullscreen' ? styles.modalFullscreenWrap : undefined}
    >
      <WidgetRenderer key={'modal'} widgetEndpoint={widgetEndpoint} />
    </AntDModal>
  )
}

export default Modal
