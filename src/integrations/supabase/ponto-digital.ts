import type { Database } from './types'

export type Filial = Database['public']['Tables']['filiais']['Row']
export type Funcionario = Database['public']['Tables']['funcionarios']['Row']
export type Dispositivo = Database['public']['Tables']['dispositivos']['Row']
export type RegistroPonto = Database['public']['Tables']['registros_ponto']['Row']
export type Escala = Database['public']['Tables']['escalas']['Row']
export type FuncionarioEscala = Database['public']['Tables']['funcionario_escala']['Row']
export type BancoHoras = Database['public']['Tables']['banco_horas']['Row']
export type Ajuste = Database['public']['Tables']['ajustes']['Row']
export type Auditoria = Database['public']['Tables']['auditoria']['Row']
export type Notificacao = Database['public']['Tables']['notificacoes']['Row']
export type Ferias = Database['public']['Tables']['ferias']['Row']

export type TipoRegistro = 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida' | 'extra_inicio' | 'extra_fim'

export interface RegistroState {
  ultimoTipo: TipoRegistro | null
  ultimoHorario: string | null
  podeRegistrar: boolean
  proximoPasso: string
}

export interface EstatisticasDiarias {
  data: string
  primeira_marcacao: string | null
  ultima_marcacao: string | null
  total_marcacoes: number
  horas_trabalhadas: string
  horas_previstas: string
  saldo: string
  status: 'ok' | 'pendente' | 'divergencia'
}

export interface InfoFuncionario extends Funcionario {
  filial_nome?: string
  escala_atual?: Escala
}

export interface AppUserPonto {
  id: string
  email: string
  role: 'master' | 'admin' | 'user'
  tenant_id: string | null
  tenant_name: string | null
  tenant_slug: string | null
  funcionario: InfoFuncionario | null
}

export const TIPOS_REGISTRO: Record<TipoRegistro, { label: string; icon: string; cor: string; ordem: number }> = {
  entrada: { label: 'Entrada', icon: 'log-in', cor: '#22c55e', ordem: 1 },
  saida_almoco: { label: 'Saída Almoço', icon: 'coffee', cor: '#eab308', ordem: 2 },
  retorno_almoco: { label: 'Retorno Almoço', icon: 'coffee', cor: '#eab308', ordem: 3 },
  saida: { label: 'Saída Final', icon: 'log-out', cor: '#ef4444', ordem: 4 },
  extra_inicio: { label: 'Extra Início', icon: 'clock-plus', cor: '#3b82f6', ordem: 5 },
  extra_fim: { label: 'Extra Fim', icon: 'clock-off', cor: '#3b82f6', ordem: 6 },
}

export function getProximoRegistro(ultimo: TipoRegistro | null): TipoRegistro {
  if (!ultimo) return 'entrada'
  const ordem = TIPOS_REGISTRO[ultimo]?.ordem || 0
  if (ordem < 3) {
    const tipos: TipoRegistro[] = ['entrada', 'saida_almoco', 'retorno_almoco', 'saida']
    return tipos[ordem]
  }
  return 'entrada'
}

export function formatarTempoRegistro(data: string): string {
  return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatarDataRegistro(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function calcularHorasTrabalhadas(registros: RegistroPonto[]): string {
  if (registros.length < 2) return '00:00'

  const sorted = [...registros].sort((a, b) =>
    new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
  )

  let totalMinutos = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = new Date(sorted[i + 1].data_hora).getTime() - new Date(sorted[i].data_hora).getTime()
    totalMinutos += diff / 60000
  }

  const horas = Math.floor(totalMinutos / 60)
  const minutos = Math.round(totalMinutos % 60)
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
}

export function calcularSaldo(registros: RegistroPonto[], horasPrevistas: number): string {
  const trabalhadoStr = calcularHorasTrabalhadas(registros)
  const [h, m] = trabalhadoStr.split(':').map(Number)
  const trabalhadoMin = h * 60 + m
  const previstoMin = horasPrevistas * 60
  const saldoMin = trabalhadoMin - previstoMin

  const signal = saldoMin >= 0 ? '+' : ''
  const abs = Math.abs(saldoMin)
  const horas = Math.floor(abs / 60)
  const minutos = Math.round(abs % 60)
  return `${signal}${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
}

export const PLANOS_SAAS = [
  { id: 'basico', nome: 'Básico', limite_funcionarios: 10, preco: 49 },
  { id: 'profissional', nome: 'Profissional', limite_funcionarios: 50, preco: 99 },
  { id: 'empresarial', nome: 'Empresarial', limite_funcionarios: 200, preco: 199 },
  { id: 'corporativo', nome: 'Corporativo', limite_funcionarios: 999999, preco: 399 },
] as const

export const TIPOS_JORNADA = [
  { value: 'fixa', label: 'Fixa' },
  { value: 'flexivel', label: 'Flexível' },
  { value: 'noturno', label: 'Noturno' },
  { value: 'plantao', label: 'Plantão 12x36' },
  { value: 'meio_periodo', label: 'Meio Período' },
  { value: 'externo', label: 'Externo' },
] as const

export const TIPOS_ESCALA = [
  { value: '5x2', label: 'Seg a Sex (5x2)' },
  { value: '6x1', label: 'Seg a Sáb (6x1)' },
  { value: '12x36', label: '12x36' },
  { value: 'turno_rotativo', label: 'Turno Rotativo' },
  { value: 'noturno', label: 'Noturno' },
  { value: 'flexivel', label: 'Flexível' },
  { value: 'personalizado', label: 'Personalizado' },
] as const

export const TIPOS_AJUSTE = [
  { value: 'correcao_ponto', label: 'Correção de Ponto' },
  { value: 'justificativa_atraso', label: 'Justificativa de Atraso' },
  { value: 'abono_falta', label: 'Abono de Falta' },
  { value: 'alteracao_escala', label: 'Alteração de Escala' },
  { value: 'outros', label: 'Outros' },
] as const
