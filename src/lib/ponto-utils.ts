import { supabase } from '@/integrations/supabase/client'
import type { TipoRegistro, RegistroPonto } from '@/integrations/supabase/ponto-digital'

export async function registrarPonto(params: {
  funcionario_id: string
  empresa_id: string
  tipo: TipoRegistro
  latitude?: string | null
  longitude?: string | null
  endereco?: string | null
  selfie_url?: string | null
  dispositivo_info?: string
}): Promise<RegistroPonto> {
  const ip = await obterIpPublico()

  const { data, error } = await supabase
    .from('registros_ponto')
    .insert({
      funcionario_id: params.funcionario_id,
      empresa_id: params.empresa_id,
      tipo: params.tipo,
      latitude: params.latitude || null,
      longitude: params.longitude || null,
      endereco: params.endereco || null,
      selfie_url: params.selfie_url || null,
      ip: ip,
      dispositivo_info: params.dispositivo_info || navigator.userAgent,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function obterUltimoRegistro(
  funcionarioId: string
): Promise<RegistroPonto | null> {
  const { data, error } = await supabase
    .from('registros_ponto')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .order('data_hora', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function obterRegistrosDoDia(
  funcionarioId: string,
  data?: string
): Promise<RegistroPonto[]> {
  const dataRef = data || new Date().toISOString().split('T')[0]

  const { data: registros, error } = await supabase
    .from('registros_ponto')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .eq('data', dataRef)
    .order('data_hora', { ascending: true })

  if (error) throw error
  return registros || []
}

export async function obterRegistrosPorMes(
  funcionarioId: string,
  mes: number,
  ano: number
): Promise<RegistroPonto[]> {
  const inicio = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('registros_ponto')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data_hora', { ascending: true })

  if (error) throw error
  return data || []
}

function getProximoPasso(ultimoTipo: TipoRegistro | null): string {
  if (!ultimoTipo) return 'Registrar Entrada'
  switch (ultimoTipo) {
    case 'entrada': return 'Registrar Saída Almoço'
    case 'saida_almoco': return 'Registrar Retorno Almoço'
    case 'retorno_almoco': return 'Registrar Saída Final'
    case 'saida': return 'Registrar Entrada (novo dia)'
    default: return 'Registrar Entrada'
  }
}

function podeRegistrar(ultimoTipo: TipoRegistro | null): boolean {
  return true
}

export function getEstadoRegistro(ultimoTipo: TipoRegistro | null) {
  return {
    ultimoTipo,
    podeRegistrar: podeRegistrar(ultimoTipo),
    proximoPasso: getProximoPasso(ultimoTipo),
  }
}

export async function obterFuncionarioPorMatricula(
  empresaId: string,
  matricula: string
) {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('matricula', matricula)
    .eq('ativo', true)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function obterFuncionarioPorAuthUser(
  authUserId: string
) {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*, filiais(nome)')
    .eq('auth_user_id', authUserId)
    .eq('ativo', true)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function obterIpPublico(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch {
    return null
  }
}

export function calcularHorasExtras(registros: RegistroPonto[], cargaDiaria: number): {
  extras: number
  debito: number
  saldo: number
} {
  if (registros.length < 2) return { extras: 0, debito: 0, saldo: 0 }

  const sorted = [...registros].sort((a, b) =>
    new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
  )

  let totalMinutos = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = new Date(sorted[i + 1].data_hora).getTime() - new Date(sorted[i].data_hora).getTime()
    if (diff > 0 && diff < 72000000) {
      totalMinutos += diff / 60000
    }
  }

  const cargaMinutos = cargaDiaria * 60
  const saldoMinutos = totalMinutos - cargaMinutos

  return {
    extras: Math.max(0, saldoMinutos / 60),
    debito: Math.max(0, -saldoMinutos / 60),
    saldo: saldoMinutos / 60,
  }
}
