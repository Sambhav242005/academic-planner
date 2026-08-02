import { z } from 'zod'
import { generateApiKey } from '@/lib/mcp/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, requireUserIdAndDemo, toErrorResponse } from '@/lib/api/route'
import { handleDemoRequest } from '@/lib/demo/intercept'

const deleteInput = z.object({ keyId: z.string().uuid() })

export async function GET() {
  try {
    const { userId, isDemo } = await requireUserIdAndDemo()
    const demo = await handleDemoRequest(userId, 'GET', 'settings/mcp-key', undefined, isDemo)
    if (demo) return demo
    const { data, error } = await createAdminClient()
      .from('mcp_api_keys')
      .select('id, name, key_prefix, last_used_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return Response.json((data ?? []).map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.key_prefix,
      lastUsedAt: key.last_used_at,
      createdAt: key.created_at,
    })))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST() {
  try {
    const { userId, isDemo } = await requireUserIdAndDemo()
    const demo = await handleDemoRequest(userId, 'POST', 'settings/mcp-key', undefined, isDemo)
    if (demo) return demo
    const supabase = createAdminClient()
    const { count, error: countError } = await supabase
      .from('mcp_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (countError) throw countError
    if ((count ?? 0) >= 10) throw new ApiError('You can have up to 10 API keys.', 400)

    const { raw, hash, prefix } = generateApiKey()
    const { error } = await supabase.from('mcp_api_keys').insert({
      user_id: userId,
      name: 'default',
      key_hash: hash,
      key_prefix: prefix,
    })
    if (error) throw error
    return Response.json({ key: raw, prefix }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, isDemo } = await requireUserIdAndDemo()
    const demo = await handleDemoRequest(userId, 'DELETE', 'settings/mcp-key', request, isDemo)
    if (demo) return demo
    const { keyId } = deleteInput.parse(await request.json())
    const { data, error } = await createAdminClient()
      .from('mcp_api_keys')
      .delete()
      .eq('id', keyId)
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
