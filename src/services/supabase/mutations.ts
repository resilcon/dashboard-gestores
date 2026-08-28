import { supabase } from '@/services/supabase/client'
import type { Colaborador, Gestor, Justificativa } from '@/types/domain'
import type { IsoDate } from '@/utils/date'

export async function criarJustificativa(payload: {
  colaboradorId: string
  data: IsoDate
  texto: string
  gestor: string
  abonado: boolean
}): Promise<void> {
  const { error } = await supabase.from('justificativas_diarias').insert({
    colaborador_id: payload.colaboradorId,
    data: payload.data,
    justificativa: payload.texto,
    gestor_nome: payload.gestor,
    abonado: payload.abonado,
  } satisfies Partial<Justificativa>)
  if (error) throw new Error(error.message)
}

/** Cria um novo colaborador — nunca reaproveita/mescla com um já existente (decisão de negócio: match difuso de nome é feito só na importação em lote, nunca aqui). */
export async function criarColaborador(payload: { nome: string; supervisor: string | null }): Promise<Colaborador> {
  const { data, error } = await supabase
    .from('colaboradores')
    .insert({ nome: payload.nome, supervisor: payload.supervisor, status: 'ativo' })
    .select('id,nome,supervisor,status,apelidos')
    .single()
  if (error) throw new Error(error.message)
  return data as Colaborador
}

export async function atualizarColaborador(
  id: string,
  payload: { supervisor: string | null; apelidos: string[] },
): Promise<void> {
  const { error } = await supabase
    .from('colaboradores')
    .update({ supervisor: payload.supervisor, apelidos: payload.apelidos })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function definirStatusColaborador(id: string, status: 'ativo' | 'inativo'): Promise<void> {
  const { error } = await supabase.from('colaboradores').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function criarGestor(payload: { nome: string; isDiretor: boolean }): Promise<Gestor> {
  const { data, error } = await supabase
    .from('gestores')
    .insert({ nome: payload.nome, is_diretor: payload.isDiretor, status: 'ativo' })
    .select('id,nome,status,is_diretor')
    .single()
  if (error) throw new Error(error.message)
  return data as Gestor
}

export async function definirGestorDiretor(id: string, isDiretor: boolean): Promise<void> {
  const { error } = await supabase.from('gestores').update({ is_diretor: isDiretor }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function definirStatusGestor(id: string, status: 'ativo' | 'inativo'): Promise<void> {
  const { error } = await supabase.from('gestores').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}
