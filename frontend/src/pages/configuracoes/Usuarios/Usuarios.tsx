import React, { useState, useEffect } from 'react'
import Table from '@cloudscape-design/components/table'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Alert from '@cloudscape-design/components/alert'
import Badge from '@cloudscape-design/components/badge'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Toggle from '@cloudscape-design/components/toggle'
import { listarUsuarios, criarUsuario, atualizarUsuario, inativarUsuario, resetSenha, alterarPerfil, excluirUsuario } from '../../../api/usuarios'
import type { Usuario } from '../../../types'
import { useAuthStore } from '../../../store/authStore'

type ModalTipo = 'novo' | 'editar' | 'senha' | 'inativar' | 'excluir' | null

export default function Usuarios() {
  const usuarioLogado = useAuthStore((s) => s.usuario)
  const isAdmin = usuarioLogado?.is_admin ?? false

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [modalTipo, setModalTipo] = useState<ModalTipo>(null)
  const [usuarioAlvo, setUsuarioAlvo] = useState<Usuario | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Form novo
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoSenha, setNovoSenha] = useState('')
  const [novoAdmin, setNovoAdmin] = useState(false)

  // Form editar
  const [editNome, setEditNome] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAdmin, setEditAdmin] = useState(false)

  // Form senha
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const resp = await listarUsuarios()
      setUsuarios(resp.data)
    } catch {
      setErro('Erro ao carregar usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const fechar = () => {
    setModalTipo(null)
    setUsuarioAlvo(null)
    setErro('')
  }

  const abrir = (tipo: ModalTipo, u?: Usuario) => {
    setErro('')
    setUsuarioAlvo(u || null)
    if (tipo === 'novo') {
      setNovoNome(''); setNovoEmail(''); setNovoSenha(''); setNovoAdmin(false)
    }
    if (tipo === 'editar' && u) {
      setEditNome(u.nome); setEditEmail(u.email); setEditAdmin(u.is_admin)
    }
    if (tipo === 'senha') {
      setNovaSenha(''); setConfirmSenha('')
    }
    setModalTipo(tipo)
  }

  const handleCriar = async () => {
    if (!novoNome || !novoEmail || !novoSenha) { setErro('Preencha todos os campos.'); return }
    if (novoSenha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setSalvando(true)
    try {
      const resp = await criarUsuario({ nome: novoNome, email: novoEmail, senha: novoSenha })
      // Se marcou admin, atualiza o perfil logo apos criar
      if (novoAdmin) {
        await alterarPerfil(resp.data.id, true)
      }
      fechar()
      setSucesso('Usuario criado com sucesso.')
      carregar()
    } catch {
      setErro('Erro ao criar usuario. Verifique se o e-mail ja esta em uso.')
    } finally {
      setSalvando(false)
    }
  }

  const handleEditar = async () => {
    if (!usuarioAlvo || !editNome || !editEmail) { setErro('Preencha todos os campos.'); return }
    setSalvando(true)
    try {
      await atualizarUsuario(usuarioAlvo.id, { nome: editNome, email: editEmail })
      // Atualiza perfil se mudou
      if (editAdmin !== usuarioAlvo.is_admin) {
        await alterarPerfil(usuarioAlvo.id, editAdmin)
      }
      fechar()
      setSucesso('Cadastro atualizado.')
      carregar()
    } catch {
      setErro('Erro ao atualizar. Verifique se o e-mail ja esta em uso.')
    } finally {
      setSalvando(false)
    }
  }

  const handleResetSenha = async () => {
    if (!usuarioAlvo) return
    if (!novaSenha || novaSenha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    if (novaSenha !== confirmSenha) { setErro('As senhas nao coincidem.'); return }
    setSalvando(true)
    try {
      await resetSenha(usuarioAlvo.id, novaSenha)
      fechar()
      setSucesso('Senha redefinida com sucesso.')
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao redefinir senha.')
    } finally {
      setSalvando(false)
    }
  }

  const handleInativar = async () => {
    if (!usuarioAlvo) return
    setSalvando(true)
    try {
      await inativarUsuario(usuarioAlvo.id)
      fechar()
      setSucesso('Usuario inativado.')
      carregar()
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao inativar.')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!usuarioAlvo) return
    setSalvando(true)
    try {
      await excluirUsuario(usuarioAlvo.id)
      fechar()
      setSucesso('Usuario excluido permanentemente.')
      carregar()
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao excluir usuario.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ContentLayout header={<Header variant="h1">Usuarios</Header>}>
      <SpaceBetween size="l">
        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}
        {sucesso && <Alert type="success" onDismiss={() => setSucesso('')}>{sucesso}</Alert>}

        <Table
          loading={loading}
          loadingText="Carregando usuarios..."
          items={usuarios}
          columnDefinitions={[
            {
              id: 'nome',
              header: 'Nome',
              cell: (u) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <span>{u.nome}</span>
                  {u.is_admin && <Badge color="blue">Admin</Badge>}
                </SpaceBetween>
              ),
              sortingField: 'nome',
            },
            { id: 'email', header: 'E-mail', cell: (u) => u.email },
            {
              id: 'ativo',
              header: 'Status',
              cell: (u) => (
                <Badge color={u.ativo ? 'green' : 'grey'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
              ),
            },
            {
              id: 'acoes',
              header: 'Acoes',
              cell: (u) => (
                <SpaceBetween direction="horizontal" size="xs">
                  {isAdmin && (
                    <Button variant="inline-link" onClick={() => abrir('editar', u)}>Editar</Button>
                  )}
                  {isAdmin && u.ativo && (
                    <Button variant="inline-link" onClick={() => abrir('senha', u)}>Senha</Button>
                  )}
                  {isAdmin && u.ativo && u.id !== usuarioLogado?.id && (
                    <Button variant="inline-link" onClick={() => abrir('inativar', u)}>Inativar</Button>
                  )}
                  {isAdmin && u.id !== usuarioLogado?.id && (
                    <Button variant="inline-link" onClick={() => abrir('excluir', u)}>Excluir</Button>
                  )}
                </SpaceBetween>
              ),
            },
          ]}
          header={
            <Header
              counter={"(" + usuarios.length + ")"}
              actions={
                isAdmin ? (
                  <Button variant="primary" iconName="add-plus" onClick={() => abrir('novo')}>
                    Novo Usuario
                  </Button>
                ) : undefined
              }
            >
              Usuarios
            </Header>
          }
          empty={<Box textAlign="center" color="inherit"><b>Nenhum usuario encontrado</b></Box>}
        />
      </SpaceBetween>

      {/* Novo usuario */}
      <Modal
        visible={modalTipo === 'novo'}
        onDismiss={fechar}
        header="Novo Usuario"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={fechar}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleCriar}>Criar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {erro && <Alert type="error">{erro}</Alert>}
          <FormField label="Nome">
            <Input value={novoNome} onChange={({ detail }) => setNovoNome(detail.value)} placeholder="Nome completo" />
          </FormField>
          <FormField label="E-mail">
            <Input type="email" value={novoEmail} onChange={({ detail }) => setNovoEmail(detail.value)} placeholder="email@empresa.com" />
          </FormField>
          <FormField label="Senha" description="Minimo 6 caracteres">
            <Input type="password" value={novoSenha} onChange={({ detail }) => setNovoSenha(detail.value)} />
          </FormField>
          <FormField label="Perfil de acesso">
            <Toggle checked={novoAdmin} onChange={({ detail }) => setNovoAdmin(detail.checked)}>
              {novoAdmin ? 'Administrador — acesso total incluindo Configuracoes' : 'Usuario comum — acesso apenas ao menu principal'}
            </Toggle>
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Editar usuario */}
      <Modal
        visible={modalTipo === 'editar'}
        onDismiss={fechar}
        header={"Editar — " + (usuarioAlvo?.nome || '')}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={fechar}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleEditar}>Salvar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {erro && <Alert type="error">{erro}</Alert>}
          <FormField label="Nome">
            <Input value={editNome} onChange={({ detail }) => setEditNome(detail.value)} />
          </FormField>
          <FormField label="E-mail">
            <Input type="email" value={editEmail} onChange={({ detail }) => setEditEmail(detail.value)} />
          </FormField>
          {usuarioAlvo?.id !== usuarioLogado?.id && (
            <FormField label="Perfil de acesso">
              <Toggle checked={editAdmin} onChange={({ detail }) => setEditAdmin(detail.checked)}>
                {editAdmin ? 'Administrador — acesso total incluindo Configuracoes' : 'Usuario comum — acesso apenas ao menu principal'}
              </Toggle>
            </FormField>
          )}
        </SpaceBetween>
      </Modal>

      {/* Redefinir senha */}
      <Modal
        visible={modalTipo === 'senha'}
        onDismiss={fechar}
        header={"Redefinir senha — " + (usuarioAlvo?.nome || '')}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={fechar}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleResetSenha}>Redefinir</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {erro && <Alert type="error">{erro}</Alert>}
          <Alert type="info">A senha atual sera substituida.</Alert>
          <FormField label="Nova senha" description="Minimo 6 caracteres">
            <Input type="password" value={novaSenha} onChange={({ detail }) => setNovaSenha(detail.value)} placeholder="Nova senha" />
          </FormField>
          <FormField label="Confirmar nova senha">
            <Input type="password" value={confirmSenha} onChange={({ detail }) => setConfirmSenha(detail.value)} placeholder="Repita a senha" />
          </FormField>
          {novaSenha && confirmSenha && novaSenha !== confirmSenha && (
            <Alert type="error">As senhas nao coincidem.</Alert>
          )}
        </SpaceBetween>
      </Modal>

      {/* Inativar */}
      <Modal
        visible={modalTipo === 'inativar'}
        onDismiss={fechar}
        header="Confirmar Inativacao"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={fechar}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleInativar}>Inativar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        Deseja inativar <strong>{usuarioAlvo?.nome}</strong>? O acesso sera bloqueado imediatamente.
      </Modal>

      {/* Excluir */}
      <Modal
        visible={modalTipo === 'excluir'}
        onDismiss={fechar}
        header="Excluir usuario"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={fechar}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleExcluir}>Excluir permanentemente</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {erro && <Alert type="error">{erro}</Alert>}
          <Alert type="warning">
            Esta acao e <strong>irreversivel</strong>. O usuario <strong>{usuarioAlvo?.nome}</strong> sera excluido permanentemente.
          </Alert>
        </SpaceBetween>
      </Modal>
    </ContentLayout>
  )
}
