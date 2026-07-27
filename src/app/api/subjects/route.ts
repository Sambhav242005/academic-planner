import { z } from 'zod'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, requireUserId, toErrorResponse } from '@/lib/api/route'

const subjectInput = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must be a hex value'),
  semesterId: z.string().uuid().nullable().optional(),
})

const updateInput = subjectInput.extend({ id: z.string().uuid() })
const deleteInput = z.object({ id: z.string().uuid() })

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semesterId')

    let query = createAdminClient()
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
    if (semesterId) {
      query = query.eq('semester_id', semesterId)
    }
    const { data, error } = await query.order('name')
    if (error) throw error
    return Response.json(data ?? [])
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId()
    const input = subjectInput.parse(await request.json())
    const { semesterId, ...rest } = input
    const { data, error } = await createAdminClient()
      .from('subjects')
      .insert({ user_id: userId, ...rest, semester_id: semesterId ?? null, color: rest.color.toLowerCase() })
      .select('*')
      .single()
    if (error) throw error
    return Response.json(data, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId()
    const input = updateInput.parse(await request.json())
    const { id, ...changes } = input
    const { data, error } = await createAdminClient()
      .from('subjects')
      .update({ ...changes, color: changes.color.toLowerCase() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError('Not found', 404)
    return Response.json(data)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId()
    const { id } = deleteInput.parse(await request.json())
    const { data, error } = await createAdminClient()
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError('Not found', 404)
    return Response.json({ deleted: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
