import { Button, Form, Input } from 'antd'
import { Link } from 'react-router'

import type { AuthModeType, LoginFormType } from '../Login.types'

import styles from './LoginForm.module.css'

type LoginType = {
  method: AuthModeType
  onSubmit: (data: LoginFormType) => void
  isLoading: boolean
}

const LoginForm = ({ isLoading, method, onSubmit }: LoginType) => {
  return (
    <section className={styles.form}>
      <Form
        autoComplete='off'
        disabled={isLoading}
        layout='vertical'
        name='basic'
        onFinish={onSubmit}
        requiredMark={false}
      >
        <Form.Item
          label='Username'
          name='username'
          rules={[{ message: 'Insert a username', required: true }]}
        >
          <Input size='large' />
        </Form.Item>

        <Form.Item
          label='Password'
          name='password'
          rules={[{ message: 'Insert a password', required: true }]}
        >
          <Input.Password size='large' />
        </Form.Item>

        { method.kind === 'basic' && (
          <div className={styles.link}>
            <Link to='/forgotpassword'>Forgot password?</Link>
          </div>
        )}

        <Form.Item>
          { method.kind === 'basic'
            ? (
              <Button className={styles.button} htmlType='submit' size='large' type='primary'>
                Sign In
              </Button>
            ) : (
              <Button
                className={styles.button}
                htmlType='submit'
                size='large'
                style={
                  method.graphics?.backgroundColor && method.graphics?.textColor
                    ? { backgroundColor: method.graphics.backgroundColor, color: method.graphics.textColor }
                    : undefined
                }
              >
                {method.graphics?.displayName || 'LDAP Sign In'}
              </Button>
            )
          }
        </Form.Item>
      </Form>
    </section>
  )
}

export default LoginForm
