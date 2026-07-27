import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') === 'true'

  const supabase = createAdminClient()

  if (activeOnly) {
    const { data, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (error) {
      return Response.json({ error: 'Unable to load semesters.' }, { status: 500 })
    }

    if (!data) {
      return Response.json(null)
    }

    return Response.json({
      id: data.id,
      label: data.label,
      isActive: data.is_active,
      createdAt: data.created_at,
    })
  }

  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: 'Unable to load semesters.' }, { status: 500 })
  }

  const mapped = (data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id,
    label: s.label,
    isActive: s.is_active,
    createdAt: s.created_at,
  }))

  return Response.json(mapped)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { label } = await request.json() as { label?: string }
  if (!label?.trim()) {
    return Response.json({ error: 'Label is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('semesters')
    .insert({
      user_id: session.user.id,
      label: label.trim(),
      is_active: false,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: 'Unable to create semester.' }, { status: 500 })
  }

  return Response.json({
    id: data.id,
    label: data.label,
    isActive: data.is_active,
    createdAt: data.created_at,
  })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, isActive, label } = await request.json() as {
    id?: string
    isActive?: boolean
    label?: string
  }

  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 })
  }

  if (label !== undefined && !label.trim()) {
    return Response.json({ error: 'Label is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: ownedSemester, error: ownershipError } = await supabase
    .from('semesters')
    .select('id')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .maybeSingle()
  if (ownershipError) {
    return Response.json({ error: 'Unable to update semester.' }, { status: 500 })
  }
  if (!ownedSemester) {
    return Response.json({ error: 'Semester not found.' }, { status: 404 })
  }

  if (isActive) {
    // Deactivate all semesters for this user, then activate the selected one
    const { error: deactivateError } = await supabase
      .from('semesters')
      .update({ is_active: false })
      .eq('user_id', session.user.id)

    if (deactivateError) {
      return Response.json({ error: 'Unable to activate semester.' }, { status: 500 })
    }
  }

  if (id) {
    const update: Record<string, unknown> = {}
    if (isActive !== undefined) update.is_active = isActive
    if (label !== undefined) update.label = label.trim().slice(0, 80)

    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('semesters')
      .update(update)
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (error) {
      return Response.json({ error: 'Unable to update semester.' }, { status: 500 })
    }
  }

  return Response.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json() as { id?: string }
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('semesters')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) {
    return Response.json({ error: 'Unable to delete semester.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
