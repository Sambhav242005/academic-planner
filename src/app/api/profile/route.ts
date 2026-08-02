import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleDemoRequest } from '@/lib/demo/intercept'
import { DEMO_EMAIL } from '@/lib/demo/seed'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const demo = await handleDemoRequest(session.user.id, 'GET', 'profile', undefined, session.user.email === DEMO_EMAIL)
  if (demo) return demo

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error) {
    return Response.json({ error: 'Unable to load profile.' }, { status: 500 })
  }

  if (!data) {
    return Response.json(null)
  }

  return Response.json({
    id: data.id,
    displayName: data.display_name ?? null,
    college: data.college ?? null,
    semester: data.semester ?? null,
    defaultTarget: data.default_target ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  })
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const demo = await handleDemoRequest(session.user.id, 'PUT', 'profile', request, session.user.email === DEMO_EMAIL)
  if (demo) return demo

  const body = await request.json()
  const { displayName, college, semester, defaultTarget } = body as {
    displayName?: string | null
    college?: string | null
    semester?: number | null
    defaultTarget?: number | null
  }

  const supabase = createAdminClient()
  const userId = session.user.id

  const updateData: Record<string, unknown> = {
    display_name: displayName?.trim().slice(0, 50) || null,
    college: college?.trim().slice(0, 100) || null,
    semester: semester ?? null,
    updated_at: new Date().toISOString(),
  }

  if (defaultTarget != null) {
    updateData.default_target = Math.min(100, Math.max(0, defaultTarget))
  }

  // Check if profile exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  let error

  if (existing) {
    const result = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
    error = result.error
  } else {
    const result = await supabase
      .from('profiles')
      .insert({
        id: userId,
        ...updateData,
      })
    error = result.error
  }

  if (error) {
    return Response.json({ error: 'Unable to save profile.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
