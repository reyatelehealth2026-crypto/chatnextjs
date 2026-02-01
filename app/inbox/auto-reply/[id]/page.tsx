import { AutoReplyEditorPage } from '@/components/inbox/auto-reply-editor-page'

export default async function InboxAutoReplyEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AutoReplyEditorPage ruleId={id} />
}
