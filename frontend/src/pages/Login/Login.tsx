import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from '@cloudscape-design/components/container'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import Alert from '@cloudscape-design/components/alert'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Header from '@cloudscape-design/components/header'
import { useAuthStore } from '../../store/authStore'
import { login, getMe } from '../../api/auth'
import client from '../../api/client'

export default function Login() {
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async () => {
    if (!email || !senha) {
      setErro('Preencha todos os campos.')
      return
    }
    setLoading(true)
    setErro('')
    try {
      const { data } = await login(email, senha)
      // Busca dados do usuario passando o token diretamente no header,
      // pois o store ainda nao foi atualizado neste momento
      const meResp = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      storeLogin(data.access_token, meResp.data)
      navigate('/dashboard')
    } catch {
      setErro('Credenciais invalidas. Verifique seu e-mail e senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f2f3f3',
      }}
    >
      <div style={{ width: 400 }}>
        <Container header={<Header variant="h1">CloudDog - Gestao de Custos</Header>}>
          <Form
            actions={
              <Button variant="primary" loading={loading} onClick={handleSubmit}>
                Entrar
              </Button>
            }
          >
            <SpaceBetween size="m">
              {erro && <Alert type="error">{erro}</Alert>}
              <FormField label="E-mail">
                <Input
                  type="email"
                  value={email}
                  onChange={({ detail }) => setEmail(detail.value)}
                  placeholder="seu@email.com"
                />
              </FormField>
              <FormField label="Senha">
                <Input
                  type="password"
                  value={senha}
                  onChange={({ detail }) => setSenha(detail.value)}
                  onKeyDown={({ detail }) => {
                    if (detail.key === 'Enter') handleSubmit()
                  }}
                />
              </FormField>
            </SpaceBetween>
          </Form>
        </Container>
      </div>
    </div>
  )
}
