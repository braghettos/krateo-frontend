import { noop } from 'lodash'
import { createContext, useContext } from 'react'

type DrawerData = {
  extra?: React.ReactNode
  title?: string
}

type DrawerContextValue = {
  insideDrawer: true
  setDrawerData: (data: DrawerData) => void
}

type DrawerProviderProps = {
  children: React.ReactNode
  setDrawerData: (data: DrawerData) => void
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

export const DrawerProvider: React.FC<DrawerProviderProps> = ({ children, setDrawerData }) => {
  return (
    <DrawerContext.Provider
      value={{
        insideDrawer: true,
        setDrawerData,
      }}
    >
      {children}
    </DrawerContext.Provider>
  )
}

export const useDrawerContext = () => {
  const context = useContext(DrawerContext)

  return context ?? { insideDrawer: false, setDrawerData: noop }
}
