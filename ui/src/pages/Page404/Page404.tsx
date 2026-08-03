import { Result } from 'antd'
import { Link } from 'react-router'

import logo from '../../assets/images/logo_black.png'

import styles from './Page404.module.css'

const Page404 = () => {
  return (
    <div className={styles.result}>
      <Result
        extra={<Link onClick={() => { window.location.href = '/' }} to=''>Go to the Home page</Link>}
        icon={<img alt='Krateo | PlatformOps' src={logo} width={400} />}
        subTitle="We can't find the page you're looking for"
        title='404 Page not found'
      />
    </div>
  )
}

export default Page404
